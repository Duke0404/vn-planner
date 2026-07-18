import { memo, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../lib/graphLayout'
import { usePlannerStore } from '../../store/usePlannerStore'
import { isVisualExpanded } from '../../store/selectors'
import { AddKindMenu } from '../graph/AddKindMenu'
import type { DialogKind } from '../../model/nodes'
import { TagChipList } from '../shared/TagChipList'

export const VisualGraphNode = memo(function VisualGraphNode({ data, width, height }: NodeProps) {
  const d = data as FlowNodeData
  if (d.nodeType !== 'visual') return null
  const { visual, sceneId } = d

  const select = usePlannerStore(s => s.select)
  const toggleExpand = usePlannerStore(s => s.toggleExpandVisual)
  const deleteVisual = usePlannerStore(s => s.deleteVisual)
  const addDialogParallel = usePlannerStore(s => s.addDialogParallel)
  const expandedVisualIds = usePlannerStore(s => s.expandedVisualIds)
  const selection = usePlannerStore(s => s.selection)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const isExpanded = isVisualExpanded(visual.id, expandedVisualIds)
  const isSelected = selection?.type === 'visual' && selection.visualId === visual.id

  function handleAddKind(kind: DialogKind) {
    addDialogParallel(sceneId, visual.id, kind)
    setShowAddMenu(false)
  }

  return (
    <div
      className={`graph-node visual-node group-node ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        minHeight: height ?? '100%',
      }}
      onClick={e => {
        e.stopPropagation()
        select({ type: 'visual', sceneId, visualId: visual.id })
      }}
    >
      <div className="group-node-header">
        <button
          className="expand-btn"
          title={isExpanded ? 'Collapse' : 'Expand'}
          onClick={e => {
            e.stopPropagation()
            toggleExpand(sceneId, visual.id)
          }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
        <span className="node-title">🖼 {visual.name || 'Visual'}</span>
        <span className="node-visual-count">
          {visual.dialogs.length} dialog{visual.dialogs.length !== 1 ? 's' : ''}
        </span>
        <div className="node-actions">
          <div className="node-add-action">
            <button
              type="button"
              className="icon-btn"
              title="Add parallel dialog"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                setShowAddMenu(v => !v)
              }}
            >
              +
            </button>
            {showAddMenu && (
              <AddKindMenu
                anchor="below"
                onSelect={handleAddKind}
                onClose={() => setShowAddMenu(false)}
              />
            )}
          </div>
          <button
            type="button"
            className="icon-btn danger"
            title="Delete visual"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              deleteVisual(sceneId, visual.id)
            }}
          >
            ×
          </button>
        </div>
      </div>
      {visual.tagIds.length > 0 && (
        <div className="group-node-tags">
          <TagChipList tagIds={visual.tagIds} />
        </div>
      )}
      <div className="group-node-body" aria-hidden="true" />
    </div>
  )
})
