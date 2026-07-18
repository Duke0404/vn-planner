import { useMemo } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { getRangesForSelection, type RangeSegment } from '../../lib/rangeAnalysis'

function formatSegment(s: RangeSegment): string {
  return s.min === s.max ? `${s.min}` : `${s.min}–${s.max}`
}

export function VariableRangesSidebar() {
  const selection = usePlannerStore(s => s.selection)
  const project = usePlannerStore(s => s.project)

  const ranges = useMemo(() => {
    if (!selection) return null
    return getRangesForSelection(selection, project.scenes, project.variables)
  }, [selection, project])

  if (!project.variables.length) {
    return (
      <div className="sidebar">
        <div className="sidebar-title">Variable Ranges</div>
        <div className="sidebar-empty">No variables — add in Config ⚙</div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      <div className="sidebar-title">Variable Ranges</div>
      {!selection ? (
        <div className="sidebar-empty">Select a node to see ranges</div>
      ) : (
        <div className="range-list">
          {ranges?.map(r => (
            <div key={r.variableId} className="range-row">
              <span className="range-label">{r.label}</span>
              <div className="range-chips">
                {r.segments.length === 0 ? (
                  <span className="range-chip impossible">∅</span>
                ) : r.segments.length === 1 ? (
                  <span className="range-chip">{formatSegment(r.segments[0])}</span>
                ) : (
                  r.segments.map((s, i) => (
                    <span key={i} className="range-chip disjoint">
                      {formatSegment(s)}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
