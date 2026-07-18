import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../lib/graphLayout'
import { usePlannerStore } from '../../store/usePlannerStore'
import { isSceneExpanded } from '../../store/selectors'
import { TagChipList } from '../shared/TagChipList'

export const SceneGraphNode = memo(function SceneGraphNode({ data, width, height }: NodeProps) {
  const d = data as FlowNodeData
  if (d.nodeType !== 'scene') return null
  const { scene } = d

  const select = usePlannerStore(s => s.select)
  const toggleExpand = usePlannerStore(s => s.toggleExpandScene)
  const deleteScene = usePlannerStore(s => s.deleteScene)
  const addVisual = usePlannerStore(s => s.addVisual)
  const expandedSceneIds = usePlannerStore(s => s.expandedSceneIds)
  const selection = usePlannerStore(s => s.selection)

  const isExpanded = isSceneExpanded(scene.id, expandedSceneIds)
  const isSelected = selection?.type === 'scene' && selection.sceneId === scene.id

  return (
    <div
      className={`graph-node scene-node group-node ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        minHeight: height ?? '100%',
      }}
      onClick={e => {
        e.stopPropagation()
        select({ type: 'scene', sceneId: scene.id })
      }}
    >
      <div className="group-node-header">
        <button
          className="expand-btn"
          title={isExpanded ? 'Collapse' : 'Expand'}
          onClick={e => {
            e.stopPropagation()
            toggleExpand(scene.id)
          }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
        <span className="node-title">🎬 {scene.name || 'Scene'}</span>
        <span className="node-visual-count">
          {scene.visuals.length} visual{scene.visuals.length !== 1 ? 's' : ''}
        </span>
        <div className="node-actions">
          <button
            type="button"
            className="icon-btn"
            title="Add parallel visual"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              addVisual(scene.id)
            }}
          >
            +
          </button>
          <button
            type="button"
            className="icon-btn danger"
            title="Delete scene"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              deleteScene(scene.id)
            }}
          >
            ×
          </button>
        </div>
      </div>
      {scene.tagIds.length > 0 && (
        <div className="group-node-meta">
          <div className="group-node-tags">
            <TagChipList tagIds={scene.tagIds} />
          </div>
        </div>
      )}
      <div className="group-node-body" aria-hidden="true" />
    </div>
  )
})
