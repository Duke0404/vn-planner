import { useMemo, useState } from 'react'
import type { EdgeProps } from '@xyflow/react'
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useEdges } from '@xyflow/react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { AddKindMenu } from './AddKindMenu'
import type { DialogKind } from '../../model/nodes'

const PARALLEL_EDGE_SPREAD = 80

interface DialogEdgeData {
  sceneId?: string
  visualId?: string
  parallelIndex?: number
  parallelTotal?: number
}

function resolveParallelMeta(
  id: string,
  source: string,
  target: string,
  edges: ReturnType<typeof useEdges>,
  edgeData: DialogEdgeData | undefined,
): { parallelIndex: number; parallelTotal: number } | null {
  if (edgeData?.parallelTotal != null && edgeData.parallelTotal > 1 && edgeData.parallelIndex != null) {
    return { parallelIndex: edgeData.parallelIndex, parallelTotal: edgeData.parallelTotal }
  }
  const siblings = edges.filter(edge => edge.source === source && edge.target === target)
  if (siblings.length <= 1) return null
  const parallelIndex = siblings.findIndex(edge => edge.id === id)
  if (parallelIndex < 0) return null
  return { parallelIndex, parallelTotal: siblings.length }
}

export function DialogEdge({
  id,
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
  const edges = useEdges()
  const edgeData = data as DialogEdgeData | undefined

  const parallelMeta = useMemo(
    () => resolveParallelMeta(id, source, target, edges, edgeData),
    [id, source, target, edges, edgeData],
  )

  const offsetX = parallelMeta
    ? PARALLEL_EDGE_SPREAD * (parallelMeta.parallelIndex - (parallelMeta.parallelTotal - 1) / 2)
    : 0

  function resolveContext(): { sceneId: string; visualId: string } | null {
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
    sourceX: sourceX + offsetX,
    sourceY,
    sourcePosition,
    targetX: targetX + offsetX,
    targetY,
    targetPosition,
  })

  const addX = labelX
  const addY = label ? labelY + 18 : labelY

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
            transform: `translate(-50%, -50%) translate(${addX}px,${addY}px)`,
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
