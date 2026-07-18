import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import {
  Scene,
  Visual,
  Dialog,
  LineDialog,
  ChoiceDialog,
  ConditionalDialog,
  isLeafDialog,
} from '../model/nodes'

const NODE_WIDTH = 240
const NODE_HEIGHT = 80
const DIALOG_WIDTH = 240
const DIALOG_HEIGHT = 72
const DIALOG_ADD_OVERFLOW = 10
const HEADER_HEIGHT = 44
const GROUP_PADDING = 20
const GROUP_GAP = 24

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

function buildDialogToVisualMap(scene: Scene): Map<string, string> {
  const map = new Map<string, string>()
  for (const visual of scene.visuals) {
    for (const dialog of visual.dialogs) {
      map.set(dialog.id, visual.id)
    }
  }
  return map
}

function findSeriesVisualParents(scene: Scene): Map<string, string> {
  const dialogToVisual = buildDialogToVisualMap(scene)
  const parents = new Map<string, string>()

  for (const visual of scene.visuals) {
    for (const dialog of visual.dialogs) {
      for (const nextId of dialog.getOutgoingIds()) {
        if (!nextId) continue
        const targetVisualId = dialogToVisual.get(nextId)
        if (targetVisualId && targetVisualId !== visual.id) {
          parents.set(targetVisualId, visual.id)
        }
      }
    }
  }

  return parents
}

function buildVisualColumns(scene: Scene, seriesParents: Map<string, string>): Visual[][] {
  const roots = scene.visuals.filter(v => !seriesParents.has(v.id))

  function buildColumn(root: Visual): Visual[] {
    const chain: Visual[] = [root]
    const children = scene.visuals.filter(v => seriesParents.get(v.id) === root.id)
    for (const child of children) {
      chain.push(...buildColumn(child))
    }
    return chain
  }

  return roots.map(buildColumn)
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
): { nodes: FlowNode[]; edges: FlowEdge[]; bounds: Bounds } {
  if (!visual.dialogs.length) {
    return {
      nodes: [],
      edges: [],
      bounds: { x: 0, y: 0, width: NODE_WIDTH, height: DIALOG_HEIGHT + GROUP_PADDING },
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
    const height = isLeafDialog(d) ? DIALOG_HEIGHT + DIALOG_ADD_OVERFLOW : DIALOG_HEIGHT
    g.setNode(d.id, { width: DIALOG_WIDTH, height })
  }

  for (const d of visual.dialogs) {
    for (const targetId of d.getOutgoingIds()) {
      if (targetId) g.setEdge(d.id, targetId)
    }
  }

  dagre.layout(g)

  const rawPositions = visual.dialogs.map(d => {
    const pos = g.node(d.id)
    return {
      id: d.id,
      x: pos.x - DIALOG_WIDTH / 2,
      y: pos.y - DIALOG_HEIGHT / 2,
      width: DIALOG_WIDTH,
      height: DIALOG_HEIGHT,
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

  // Center dialog column horizontally; stack from header downward
  const offsetX = (visualWidth - contentWidth) / 2 - minX
  const offsetY = HEADER_HEIGHT + GROUP_PADDING - minY

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  for (const d of visual.dialogs) {
    const raw = rawPositions.find(p => p.id === d.id)!
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
            type: 'smoothstep',
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
          type: 'smoothstep',
          style: { stroke: '#22c55e' },
        })
      }
      if (cond.falseNextId) {
        edges.push({
          id: `e-${d.id}-false-${cond.falseNextId}`,
          source: d.id,
          target: cond.falseNextId,
          label: 'false',
          type: 'smoothstep',
          style: { stroke: '#ef4444' },
        })
      }
    }
  }

  const bounds: Bounds = {
    x: 0,
    y: 0,
    width: visualWidth,
    height: HEADER_HEIGHT + visualContentHeight,
  }

  return { nodes, edges, bounds }
}

function layoutVisualsInScene(
  scene: Scene,
  expandedVisualIds: Set<string>,
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
      return { visual, layoutResult: layoutDialogs(visual, scene.id) }
    }
    return {
      visual,
      layoutResult: {
        nodes: [] as FlowNode[],
        edges: [] as FlowEdge[],
        bounds: { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT },
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
  const seriesParents = findSeriesVisualParents(scene)
  const columns = buildVisualColumns(scene, seriesParents)

  const visualPlacements: {
    visual: Visual
    x: number
    y: number
    width: number
    height: number
    layoutResult: ReturnType<typeof layoutDialogs>
  }[] = []

  let columnX = GROUP_PADDING
  let maxColumnStackHeight = 0

  for (const column of columns) {
    let y = HEADER_HEIGHT + GROUP_PADDING
    const columnWidth = Math.max(
      ...column.map(v => layoutByVisualId.get(v.id)!.bounds.width),
    )

    for (const visual of column) {
      const layoutResult = layoutByVisualId.get(visual.id)!
      visualPlacements.push({
        visual,
        x: columnX + (columnWidth - layoutResult.bounds.width) / 2,
        y,
        width: layoutResult.bounds.width,
        height: layoutResult.bounds.height,
        layoutResult,
      })
      y += layoutResult.bounds.height + GROUP_GAP
    }

    const stackHeight = y - (HEADER_HEIGHT + GROUP_PADDING)
    maxColumnStackHeight = Math.max(maxColumnStackHeight, stackHeight)
    columnX += columnWidth + GROUP_GAP
  }

  const contentWidth =
    columns.reduce((sum, column) => {
      const width = Math.max(
        ...column.map(v => layoutByVisualId.get(v.id)!.bounds.width),
      )
      return sum + width
    }, 0) + GROUP_GAP * Math.max(0, columns.length - 1)
  const sceneWidth = Math.max(NODE_WIDTH, contentWidth + GROUP_PADDING * 2)
  const sceneContentHeight = maxColumnStackHeight + GROUP_PADDING * 2
  const offsetX = (sceneWidth - contentWidth) / 2 - GROUP_PADDING

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
): GraphLayout {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  if (!scenes.length) {
    return { nodes, edges }
  }

  const sceneLayouts = scenes.map(scene => {
    const expanded = expandedSceneIds.has(scene.id)

    if (!expanded) {
      return {
        scene,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        visualPlacements: null as ReturnType<typeof layoutVisualsInScene>['visualPlacements'] | null,
      }
    }

    const { visualPlacements, sceneWidth, sceneContentHeight } =
      layoutVisualsInScene(scene, expandedVisualIds)

    return {
      scene,
      width: sceneWidth,
      height: HEADER_HEIGHT + sceneContentHeight,
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
