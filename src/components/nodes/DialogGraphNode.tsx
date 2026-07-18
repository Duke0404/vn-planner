import { memo, useState } from 'react'
import { Handle, Position, EdgeLabelRenderer, useInternalNode } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../lib/graphLayout'
import { usePlannerStore } from '../../store/usePlannerStore'
import { LeafAddMenu } from '../graph/LeafAddMenu'
import type { DialogKind } from '../../model/nodes'
import type { SeriesInsertTarget } from '../../lib/nestedMutations'
import { LineDialog, isLeafDialog } from '../../model/nodes'
import { findSpeaker } from '../../lib/speakerTree'
import { NARRATION_COLOR } from '../../model/colors'
import { TagChipList } from '../shared/TagChipList'
import { getDialogPreviewText } from '../../lib/dialogNodeLayout'

function kindIcon(kind: 'line' | 'choice' | 'conditional') {
  if (kind === 'line') return '💬'
  if (kind === 'choice') return '🔀'
  return '❓'
}

export const DialogGraphNode = memo(function DialogGraphNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData
  if (d.nodeType !== 'dialog') return null
  const { dialog, visualId, sceneId } = d

  const internalNode = useInternalNode(id)
  const addAnchor =
    internalNode?.internals.positionAbsolute &&
    internalNode.measured.width != null &&
    internalNode.measured.height != null
      ? {
          x: internalNode.internals.positionAbsolute.x + internalNode.measured.width / 2,
          y: internalNode.internals.positionAbsolute.y + internalNode.measured.height,
        }
      : null

  const speakers = usePlannerStore(s => s.project.speakers)
  const visual = usePlannerStore(s => {
    const scene = s.project.scenes.find(sc => sc.id === sceneId)
    return scene?.visuals.find(v => v.id === visualId)
  })
  const liveDialog = visual?.dialogs.find(dg => dg.id === dialog.id) ?? dialog
  const showSeriesAdd = isLeafDialog(liveDialog)
  const lineSpeaker =
    liveDialog.kind === 'line' && (liveDialog as LineDialog).speakerId
      ? findSpeaker(speakers, (liveDialog as LineDialog).speakerId!)
      : null
  const speakerColor = lineSpeaker?.color ?? NARRATION_COLOR
  const previewText = getDialogPreviewText(liveDialog, speakers)

  const select = usePlannerStore(s => s.select)
  const deleteDialogAction = usePlannerStore(s => s.deleteDialog)
  const insertDialogAfter = usePlannerStore(s => s.insertDialogAfter)
  const selection = usePlannerStore(s => s.selection)
  const linkPickMode = usePlannerStore(s => s.linkPickMode)
  const applyLinkPick = usePlannerStore(s => s.applyLinkPick)
  const openContextMenu = usePlannerStore(s => s.openContextMenu)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const isSelected = selection?.type === 'dialog' && selection.dialogId === dialog.id
  const isLinkTarget = linkPickMode !== null && linkPickMode.visualId === visualId

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isLinkTarget && dialog.id !== linkPickMode?.sourceId) {
      applyLinkPick(dialog.id)
    } else {
      select({ type: 'dialog', sceneId, visualId, dialogId: dialog.id })
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const msg = deleteDialogAction(sceneId, visualId, dialog.id)
    if (msg) alert(msg)
  }

  function handleAddSeries(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setShowAddMenu(v => !v)
  }

  function handleAddKind(kind: DialogKind, target: SeriesInsertTarget) {
    insertDialogAfter(sceneId, visualId, dialog.id, kind, target)
    setShowAddMenu(false)
  }

  return (
    <div
      className={`graph-node dialog-node kind-${dialog.kind} ${isSelected ? 'selected' : ''} ${isLinkTarget ? 'link-target' : ''}`}
      onContextMenu={e => {
        e.preventDefault()
        e.stopPropagation()
        openContextMenu({
          kind: 'dialog',
          sceneId,
          visualId,
          dialogId: dialog.id,
          x: e.clientX,
          y: e.clientY,
        })
      }}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="kind-icon">{kindIcon(dialog.kind)}</span>
        <span
          className="node-preview"
          style={{ color: liveDialog.kind === 'line' ? speakerColor : undefined }}
        >
          {previewText}
        </span>
        <div className="node-actions">
          <button
            type="button"
            className="icon-btn danger nodrag nopan"
            title="Delete dialog"
            onMouseDown={e => e.stopPropagation()}
            onClick={handleDelete}
          >
            ×
          </button>
        </div>
      </div>
      {liveDialog.tagIds.length > 0 && (
        <div className="node-tags">
          <TagChipList tagIds={liveDialog.tagIds.slice(0, 3)} small />
        </div>
      )}
      {showSeriesAdd && addAnchor && (
        <EdgeLabelRenderer>
          <div
            className="dialog-node-add edge-add-wrapper nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${addAnchor.x}px, ${addAnchor.y}px)`,
              pointerEvents: 'all',
            }}
          >
            <button
              type="button"
              className="edge-add-btn nodrag nopan"
              title="Add dialog below (series)"
              onMouseDown={e => e.stopPropagation()}
              onClick={handleAddSeries}
            >
              +
            </button>
            {showAddMenu && (
              <LeafAddMenu
                anchor="above"
                onSelect={handleAddKind}
                onClose={() => setShowAddMenu(false)}
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
