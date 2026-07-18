import { useState } from 'react'
import type { EdgeProps } from '@xyflow/react'
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { AddKindMenu } from './AddKindMenu'
import type { DialogKind } from '../../model/nodes'

export function DialogEdge({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  style,
}: EdgeProps) {
  const [showMenu, setShowMenu] = useState(false)
  const scenes = usePlannerStore(s => s.project.scenes)
  const addDialogSeries = usePlannerStore(s => s.addDialogSeries)

  function resolveContext(): { sceneId: string; visualId: string } | null {
    const edgeData = data as { sceneId?: string; visualId?: string } | undefined
    if (edgeData?.sceneId && edgeData?.visualId) {
      return { sceneId: edgeData.sceneId, visualId: edgeData.visualId }
    }
    for (const scene of scenes) {
      for (const visual of scene.visuals) {
        if (visual.dialogs.some(d => d.id === source)) {
          return { sceneId: scene.id, visualId: visual.id }
        }
      }
    }
    return null
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  function handleAdd(kind: DialogKind) {
    const ctx = resolveContext()
    if (!ctx) return
    addDialogSeries(ctx.sceneId, ctx.visualId, source, target, kind)
    setShowMenu(false)
  }

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              pointerEvents: 'none',
              background: 'var(--bg-2)',
              padding: '1px 5px',
              borderRadius: 3,
              color: 'var(--text-muted)',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
            pointerEvents: 'all',
          }}
          className="edge-add-wrapper nodrag nopan"
        >
          <button
            type="button"
            className="edge-add-btn nodrag nopan"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              setShowMenu(v => !v)
            }}
            title="Insert dialog here (series)"
          >
            +
          </button>
          {showMenu && (
            <AddKindMenu onSelect={handleAdd} onClose={() => setShowMenu(false)} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
