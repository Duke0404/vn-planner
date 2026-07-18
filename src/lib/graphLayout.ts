import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import {
  Scene,
  Visual,
  Dialog,
  LineDialog,
  ChoiceDialog,
  ConditionalDialog,
} from '../model/nodes'
import { estimateMetaHeight } from './visualMetaLayout'
import {
  DIALOG_WIDTH,
  DIALOG_MIN_HEIGHT,
  estimateDialogHeight,
} from './dialogNodeLayout'
import type { Speaker } from '../model/speakers'

const NODE_WIDTH = DIALOG_WIDTH
const NODE_HEIGHT = 80
const HEADER_HEIGHT = 44
const GROUP_PADDING = 20
const GROUP_GAP = 24

function collapsedGroupHeight(metaHeight: number): number {
  if (metaHeight === 0) return NODE_HEIGHT
  return HEADER_HEIGHT + metaHeight
}

export type FlowNodeData =
  | { nodeType: 'scene'; scene: Scene }
  | { nodeType: 'visual'; visual: Visual; sceneId: string }
  | { nodeType: 'dialog'; dialog: Dialog; visualId: string; sceneId: string }

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

export interface GraphLayout {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** Fan-out metadata for multiple edges sharing the same source and target. */
function annotateParallelEdges(edges: FlowEdge[]): void {
  const groups = new Map<string, FlowEdge[]>()
  for (const edge of edges) {
    const key = `${edge.source}\0${edge.target}`
    const group = groups.get(key)
    if (group) group.push(edge)
    else groups.set(key, [edge])
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue
    group.forEach((edge, index) => {
      edge.data = { ...(edge.data as object), parallelIndex: index, parallelTotal: group.length }
    })
  }
}

function buildDialogToVisualMap(scene: Scene): Map<string, string> {
  const map = new Map<string, string>()
  for (const visual of scene.visuals) {
    for (const dialog of visual.dialogs) {
      map.set(dialog.id, visual.id)
    }
  }
  return map
}

interface VisualLinkAnalysis {
  seriesParent: Map<string, string>
  parallelParent: Map<string, string>
}

interface VisualTreeNode {
  visual: Visual
  parallelChildren: VisualTreeNode[]
  seriesChild: VisualTreeNode | null
}

type VisualLayoutResult = ReturnType<typeof layoutDialogs>

type VisualPlacement = {
  visual: Visual
  x: number
  y: number
  width: number
  height: number
  layoutResult: VisualLayoutResult
}

function analyzeVisualLinks(scene: Scene): VisualLinkAnalysis {
  const dialogToVisual = buildDialogToVisualMap(scene)
  const seriesParent = new Map<string, string>()
  const parallelParent = new Map<string, string>()

  for (const visual of scene.visuals) {
    for (const dialog of visual.dialogs) {
      if (dialog.kind === 'choice') {
        const cd = dialog as ChoiceDialog
        const crossVisualTargets = new Set<string>()
        for (const opt of cd.options) {
          if (!opt.nextId) continue
          const targetVisualId = dialogToVisual.get(opt.nextId)
          if (targetVisualId && targetVisualId !== visual.id) {
            crossVisualTargets.add(targetVisualId)
          }
        }
        if (crossVisualTargets.size >= 2) {
          for (const targetVisualId of crossVisualTargets) {
            parallelParent.set(targetVisualId, visual.id)
            seriesParent.delete(targetVisualId)
          }
        } else if (crossVisualTargets.size === 1) {
          const targetVisualId = [...crossVisualTargets][0]
          if (!parallelParent.has(targetVisualId)) {
            seriesParent.set(targetVisualId, visual.id)
          }
        }
      } else if (dialog.kind === 'conditional') {
        const cond = dialog as ConditionalDialog
        const crossVisualTargets = new Set<string>()
        if (cond.trueNextId) {
          const targetVisualId = dialogToVisual.get(cond.trueNextId)
          if (targetVisualId && targetVisualId !== visual.id) {
            crossVisualTargets.add(targetVisualId)
          }
        }
        if (cond.falseNextId) {
          const targetVisualId = dialogToVisual.get(cond.falseNextId)
          if (targetVisualId && targetVisualId !== visual.id) {
            crossVisualTargets.add(targetVisualId)
          }
        }
        if (crossVisualTargets.size >= 2) {
          for (const targetVisualId of crossVisualTargets) {
            parallelParent.set(targetVisualId, visual.id)
            seriesParent.delete(targetVisualId)
          }
        } else if (crossVisualTargets.size === 1) {
          const targetVisualId = [...crossVisualTargets][0]
          if (!parallelParent.has(targetVisualId)) {
            seriesParent.set(targetVisualId, visual.id)
          }
        }
      } else if (dialog.kind === 'line') {
        const ld = dialog as LineDialog
        if (!ld.nextId) continue
        const targetVisualId = dialogToVisual.get(ld.nextId)
        if (targetVisualId && targetVisualId !== visual.id && !parallelParent.has(targetVisualId)) {
          seriesParent.set(targetVisualId, visual.id)
        }
      }
    }
  }

  return { seriesParent, parallelParent }
}

function buildVisualTrees(
  scene: Scene,
  seriesParent: Map<string, string>,
  parallelParent: Map<string, string>,
): VisualTreeNode[] {
  const visited = new Set<string>()

  function buildNode(visual: Visual): VisualTreeNode {
    visited.add(visual.id)
    const parallelChildren = scene.visuals
      .filter(v => parallelParent.get(v.id) === visual.id)
      .map(v => buildNode(v))

    const seriesChildVisual = scene.visuals.find(
      v => seriesParent.get(v.id) === visual.id && !parallelParent.has(v.id),
    )
    const seriesChild = seriesChildVisual ? buildNode(seriesChildVisual) : null

    return { visual, parallelChildren, seriesChild }
  }

  const trees = scene.visuals
    .filter(v => !seriesParent.has(v.id) && !parallelParent.has(v.id))
    .map(v => buildNode(v))

  for (const visual of scene.visuals) {
    if (!visited.has(visual.id)) {
      trees.push(buildNode(visual))
    }
  }

  return trees
}

function measureVisualSubtree(
  node: VisualTreeNode,
  layoutByVisualId: Map<string, VisualLayoutResult>,
): { width: number; height: number } {
  const self = layoutByVisualId.get(node.visual.id)!.bounds

  let width = self.width
  let height = self.height

  if (node.parallelChildren.length > 0) {
    const childMeasures = node.parallelChildren.map(child =>
      measureVisualSubtree(child, layoutByVisualId),
    )
    const rowWidth =
      childMeasures.reduce((sum, m) => sum + m.width, 0) +
      GROUP_GAP * Math.max(0, childMeasures.length - 1)
    const rowHeight = Math.max(...childMeasures.map(m => m.height))
    width = Math.max(width, rowWidth)
    height += GROUP_GAP + rowHeight
  }

  if (node.seriesChild) {
    const childMeasure = measureVisualSubtree(node.seriesChild, layoutByVisualId)
    width = Math.max(width, childMeasure.width)
    height += GROUP_GAP + childMeasure.height
  }

  return { width, height }
}

function placeVisualSubtree(
  node: VisualTreeNode,
  x: number,
  y: number,
  layoutByVisualId: Map<string, VisualLayoutResult>,
  out: VisualPlacement[],
): number {
  const layoutResult = layoutByVisualId.get(node.visual.id)!
  const width = layoutResult.bounds.width
  const height = layoutResult.bounds.height
  const centerX = x + width / 2

  out.push({
    visual: node.visual,
    x,
    y,
    width,
    height,
    layoutResult,
  })

  let bottom = y + height

  if (node.parallelChildren.length > 0) {
    const childMeasures = node.parallelChildren.map(child =>
      measureVisualSubtree(child, layoutByVisualId),
    )
    const rowWidth =
      childMeasures.reduce((sum, m) => sum + m.width, 0) +
      GROUP_GAP * Math.max(0, node.parallelChildren.length - 1)
    let rowX = centerX - rowWidth / 2
    const rowY = bottom + GROUP_GAP
    let rowBottom = rowY

    for (let i = 0; i < node.parallelChildren.length; i++) {
      rowBottom = Math.max(
        rowBottom,
        placeVisualSubtree(node.parallelChildren[i], rowX, rowY, layoutByVisualId, out),
      )
      rowX += childMeasures[i].width + GROUP_GAP
    }

    bottom = rowBottom
  }

  if (node.seriesChild) {
    const childLayout = layoutByVisualId.get(node.seriesChild.visual.id)!
    const childX = centerX - childLayout.bounds.width / 2
    bottom = placeVisualSubtree(
      node.seriesChild,
      childX,
      bottom + GROUP_GAP,
      layoutByVisualId,
      out,
    )
  }

  return bottom
}

function buildDialogToSceneMap(scenes: Scene[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const scene of scenes) {
    for (const visual of scene.visuals) {
      for (const dialog of visual.dialogs) {
        map.set(dialog.id, scene.id)
      }
    }
  }
  return map
}

function findSeriesSceneParents(scenes: Scene[]): Map<string, string> {
  const dialogToScene = buildDialogToSceneMap(scenes)
  const parents = new Map<string, string>()

  for (const scene of scenes) {
    for (const visual of scene.visuals) {
      for (const dialog of visual.dialogs) {
        for (const nextId of dialog.getOutgoingIds()) {
          if (!nextId) continue
          const targetSceneId = dialogToScene.get(nextId)
          if (targetSceneId && targetSceneId !== scene.id) {
            parents.set(targetSceneId, scene.id)
          }
        }
      }
    }
  }

  return parents
}

function buildSceneColumns(scenes: Scene[], seriesParents: Map<string, string>): Scene[][] {
  const roots = scenes.filter(s => !seriesParents.has(s.id))

  function buildColumn(root: Scene): Scene[] {
    const chain: Scene[] = [root]
    const children = scenes.filter(s => seriesParents.get(s.id) === root.id)
    for (const child of children) {
      chain.push(...buildColumn(child))
    }
    return chain
  }

  return roots.map(buildColumn)
}

function layoutDialogs(
  visual: Visual,
  sceneId: string,
  speakers: Speaker[],
): { nodes: FlowNode[]; edges: FlowEdge[]; bounds: Bounds } {
  const metaHeight = estimateMetaHeight(visual.description, visual.tagIds.length)
  const dialogHeight = (d: Dialog) => estimateDialogHeight(d, speakers)

  if (!visual.dialogs.length) {
    return {
      nodes: [],
      edges: [],
      bounds: {
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: HEADER_HEIGHT + metaHeight + DIALOG_MIN_HEIGHT + GROUP_PADDING,
      },
    }
  }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    align: 'C',
    nodesep: 32,
    ranksep: 40,
    marginx: GROUP_PADDING,
    marginy: GROUP_PADDING,
  })

  for (const d of visual.dialogs) {
    g.setNode(d.id, { width: DIALOG_WIDTH, height: dialogHeight(d) })
  }

  for (const d of visual.dialogs) {
    for (const targetId of d.getOutgoingIds()) {
      if (targetId) g.setEdge(d.id, targetId)
    }
  }

  dagre.layout(g)

  const rawPositions = visual.dialogs.map(d => {
    const pos = g.node(d.id)
    const height = dialogHeight(d)
    return {
      id: d.id,
      x: pos.x - DIALOG_WIDTH / 2,
      y: pos.y - height / 2,
      width: DIALOG_WIDTH,
      height,
    }
  })

  const minX = Math.min(...rawPositions.map(p => p.x))
  const maxX = Math.max(...rawPositions.map(p => p.x + p.width))
  const minY = Math.min(...rawPositions.map(p => p.y))
  const maxY = Math.max(...rawPositions.map(p => p.y + p.height))

  const contentWidth = maxX - minX
  const contentHeight = maxY - minY
  const visualWidth = Math.max(NODE_WIDTH, contentWidth + GROUP_PADDING * 2)
  const visualContentHeight = contentHeight + GROUP_PADDING * 2

  // Center dialog column horizontally; stack from header + meta downward
  const offsetX = (visualWidth - contentWidth) / 2 - minX
  const offsetY = HEADER_HEIGHT + metaHeight + GROUP_PADDING - minY

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  for (const d of visual.dialogs) {
    const raw = rawPositions.find(p => p.id === d.id)!
    const height = raw.height
    nodes.push({
      id: d.id,
      type: 'dialogNode',
      parentId: visual.id,
      position: {
        x: raw.x + offsetX,
        y: raw.y + offsetY,
      },
      data: { nodeType: 'dialog', dialog: d, visualId: visual.id, sceneId },
      extent: 'parent',
      draggable: false,
      selectable: true,
      width: DIALOG_WIDTH,
      height,
      style: { width: DIALOG_WIDTH, height },
    } as FlowNode)
  }

  for (const d of visual.dialogs) {
    if (d.kind === 'line') {
      const ld = d as LineDialog
      if (ld.nextId) {
        edges.push({
          id: `e-${d.id}-${ld.nextId}`,
          source: d.id,
          target: ld.nextId,
          type: 'dialogEdge',
          data: {
            sourceDialogId: d.id,
            targetDialogId: ld.nextId,
            visualId: visual.id,
            sceneId,
          },
        })
      }
    } else if (d.kind === 'choice') {
      const cd = d as ChoiceDialog
      for (const opt of cd.options) {
        if (opt.nextId) {
          edges.push({
            id: `e-${d.id}-${opt.id}-${opt.nextId}`,
            source: d.id,
            target: opt.nextId,
            label: opt.label,
            type: 'dialogEdge',
            data: {
              sourceDialogId: d.id,
              targetDialogId: opt.nextId,
              optionId: opt.id,
              visualId: visual.id,
              sceneId,
            },
          })
        }
      }
    } else if (d.kind === 'conditional') {
      const cond = d as ConditionalDialog
      if (cond.trueNextId) {
        edges.push({
          id: `e-${d.id}-true-${cond.trueNextId}`,
          source: d.id,
          target: cond.trueNextId,
          label: 'true',
          type: 'dialogEdge',
          style: { stroke: '#22c55e' },
          data: {
            sourceDialogId: d.id,
            targetDialogId: cond.trueNextId,
            branch: 'true',
            visualId: visual.id,
            sceneId,
          },
        })
      }
      if (cond.falseNextId) {
        edges.push({
          id: `e-${d.id}-false-${cond.falseNextId}`,
          source: d.id,
          target: cond.falseNextId,
          label: 'false',
          type: 'dialogEdge',
          style: { stroke: '#ef4444' },
          data: {
            sourceDialogId: d.id,
            targetDialogId: cond.falseNextId,
            branch: 'false',
            visualId: visual.id,
            sceneId,
          },
        })
      }
    }
  }

  annotateParallelEdges(edges)

  const bounds: Bounds = {
    x: 0,
    y: 0,
    width: visualWidth,
    height: HEADER_HEIGHT + metaHeight + visualContentHeight,
  }

  return { nodes, edges, bounds }
}

function layoutVisualsInScene(
  scene: Scene,
  expandedVisualIds: Set<string>,
  speakers: Speaker[],
): {
  visualPlacements: {
    visual: Visual
    x: number
    y: number
    width: number
    height: number
    layoutResult: ReturnType<typeof layoutDialogs>
  }[]
  sceneWidth: number
  sceneContentHeight: number
} {
  const visualLayouts = scene.visuals.map(visual => {
    const vExpanded = expandedVisualIds.has(visual.id)
    if (vExpanded) {
      return { visual, layoutResult: layoutDialogs(visual, scene.id, speakers) }
    }
    const metaHeight = estimateMetaHeight(visual.description, visual.tagIds.length)
    return {
      visual,
      layoutResult: {
        nodes: [] as FlowNode[],
        edges: [] as FlowEdge[],
        bounds: {
          x: 0,
          y: 0,
          width: NODE_WIDTH,
          height: collapsedGroupHeight(metaHeight),
        },
      },
    }
  })

  if (!visualLayouts.length) {
    return {
      visualPlacements: [],
      sceneWidth: NODE_WIDTH + GROUP_PADDING * 2,
      sceneContentHeight: GROUP_PADDING,
    }
  }

  const layoutByVisualId = new Map(
    visualLayouts.map(({ visual, layoutResult }) => [visual.id, layoutResult]),
  )
  const { seriesParent, parallelParent } = analyzeVisualLinks(scene)
  const rootTrees = buildVisualTrees(scene, seriesParent, parallelParent)

  const visualPlacements: VisualPlacement[] = []

  let columnX = GROUP_PADDING
  let maxColumnStackHeight = 0

  const sceneMetaHeight = estimateMetaHeight(undefined, scene.tagIds.length)
  const startY = HEADER_HEIGHT + GROUP_PADDING + sceneMetaHeight

  for (const rootTree of rootTrees) {
    const measure = measureVisualSubtree(rootTree, layoutByVisualId)
    const bottom = placeVisualSubtree(rootTree, columnX, startY, layoutByVisualId, visualPlacements)
    maxColumnStackHeight = Math.max(maxColumnStackHeight, bottom - startY)
    columnX += measure.width + GROUP_GAP
  }

  if (!visualPlacements.length) {
    return {
      visualPlacements: [],
      sceneWidth: NODE_WIDTH + GROUP_PADDING * 2,
      sceneContentHeight: GROUP_PADDING,
    }
  }

  const minX = Math.min(...visualPlacements.map(p => p.x))
  const maxX = Math.max(...visualPlacements.map(p => p.x + p.width))
  const contentWidth = maxX - minX
  const sceneWidth = Math.max(NODE_WIDTH, contentWidth + GROUP_PADDING * 2)
  const sceneContentHeight = maxColumnStackHeight + GROUP_PADDING * 2
  const offsetX = (sceneWidth - contentWidth) / 2 - minX

  return {
    visualPlacements: visualPlacements.map(p => ({ ...p, x: p.x + offsetX })),
    sceneWidth,
    sceneContentHeight,
  }
}

export function computeGraphLayout(
  scenes: Scene[],
  expandedSceneIds: Set<string>,
  expandedVisualIds: Set<string>,
  speakers: Speaker[] = [],
): GraphLayout {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  if (!scenes.length) {
    return { nodes, edges }
  }

  const sceneLayouts = scenes.map(scene => {
    const expanded = expandedSceneIds.has(scene.id)

    if (!expanded) {
      const metaHeight = estimateMetaHeight(undefined, scene.tagIds.length)
      return {
        scene,
        width: NODE_WIDTH,
        height: collapsedGroupHeight(metaHeight),
        visualPlacements: null as ReturnType<typeof layoutVisualsInScene>['visualPlacements'] | null,
      }
    }

    const { visualPlacements, sceneWidth, sceneContentHeight } =
      layoutVisualsInScene(scene, expandedVisualIds, speakers)
    const sceneMetaHeight = estimateMetaHeight(undefined, scene.tagIds.length)

    return {
      scene,
      width: sceneWidth,
      height: HEADER_HEIGHT + sceneMetaHeight + sceneContentHeight,
      visualPlacements,
    }
  })

  const sceneSeriesParents = findSeriesSceneParents(scenes)
  const sceneColumns = buildSceneColumns(scenes, sceneSeriesParents)

  const sceneLayoutById = new Map(
    sceneLayouts.map(layout => [layout.scene.id, layout]),
  )

  let columnX = 40
  const baseY = 40

  for (const column of sceneColumns) {
    let y = baseY
    let columnWidth = 0

    for (const scene of column) {
      const layout = sceneLayoutById.get(scene.id)!
      columnWidth = Math.max(columnWidth, layout.width)

      nodes.push({
        id: layout.scene.id,
        type: 'sceneNode',
        position: { x: columnX, y },
        data: { nodeType: 'scene', scene: layout.scene },
        draggable: false,
        width: layout.width,
        height: layout.height,
        style: { width: layout.width, height: layout.height },
      } as FlowNode)

      y += layout.height + GROUP_GAP

      if (!layout.visualPlacements) continue

      for (const placement of layout.visualPlacements) {
        const vExpanded = expandedVisualIds.has(placement.visual.id)

        nodes.push({
          id: placement.visual.id,
          type: 'visualNode',
          parentId: layout.scene.id,
          position: { x: placement.x, y: placement.y },
          data: { nodeType: 'visual', visual: placement.visual, sceneId: layout.scene.id },
          draggable: false,
          extent: 'parent',
          width: placement.width,
          height: placement.height,
          style: { width: placement.width, height: placement.height },
        } as FlowNode)

        if (vExpanded) {
          nodes.push(...placement.layoutResult.nodes)
          edges.push(...placement.layoutResult.edges)
        }
      }
    }

    columnX += columnWidth + GROUP_GAP
  }

  return { nodes, edges }
}
