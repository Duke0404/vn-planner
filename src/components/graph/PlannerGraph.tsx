import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  PanOnScrollMode,
} from '@xyflow/react'
import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePlannerStore } from '../../store/usePlannerStore'
import { computeGraphLayout } from '../../lib/graphLayout'
import { SceneGraphNode } from '../nodes/SceneGraphNode'
import { VisualGraphNode } from '../nodes/VisualGraphNode'
import { DialogGraphNode } from '../nodes/DialogGraphNode'
import { DialogEdge } from './DialogEdge'
import { NodeContextMenu } from './NodeContextMenu'

const nodeTypes: NodeTypes = {
  sceneNode: SceneGraphNode,
  visualNode: VisualGraphNode,
  dialogNode: DialogGraphNode,
}

const edgeTypes: EdgeTypes = {
  dialogEdge: DialogEdge,
}

export function PlannerGraph() {
  const scenes = usePlannerStore(s => s.project.scenes)
  const speakers = usePlannerStore(s => s.project.speakers)
  const expandedSceneIds = usePlannerStore(s => s.expandedSceneIds)
  const expandedVisualIds = usePlannerStore(s => s.expandedVisualIds)
  const select = usePlannerStore(s => s.select)
  const linkPickMode = usePlannerStore(s => s.linkPickMode)
  const cancelLinkPick = usePlannerStore(s => s.cancelLinkPick)
  const closeContextMenu = usePlannerStore(s => s.closeContextMenu)

  const { nodes, edges } = useMemo(
    () =>
      computeGraphLayout(
        scenes,
        new Set(expandedSceneIds),
        new Set(expandedVisualIds),
        speakers,
      ),
    [scenes, speakers, expandedSceneIds, expandedVisualIds],
  )

  const onPaneClick = useCallback(() => {
    closeContextMenu()
    if (linkPickMode) {
      cancelLinkPick()
    } else {
      select(null)
    }
  }, [select, linkPickMode, cancelLinkPick, closeContextMenu])

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault()
      closeContextMenu()
    },
    [closeContextMenu],
  )

  return (
    <div className={`planner-graph ${linkPickMode ? 'link-pick-active' : ''}`}>
      {linkPickMode && (
        <div className="link-pick-banner">
          Click a dialog node to link it as target.{' '}
          <button onClick={cancelLinkPick}>Cancel</button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
      <NodeContextMenu />
    </div>
  )
}
