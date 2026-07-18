import { useRef, useEffect, useState } from 'react'
import type { DialogKind } from '../../model/nodes'
import type { SeriesInsertTarget } from '../../lib/nestedMutations'

interface Props {
  onSelect: (kind: DialogKind, target: SeriesInsertTarget) => void
  onClose: () => void
  anchor?: 'below' | 'above'
}

const TARGETS: { id: SeriesInsertTarget; label: string }[] = [
  { id: 'same-visual', label: 'Same visual' },
  { id: 'new-visual', label: 'New visual' },
  { id: 'new-scene', label: 'New scene' },
]

const KINDS: { id: DialogKind; label: string }[] = [
  { id: 'line', label: '💬 Line' },
  { id: 'choice', label: '🔀 Choice' },
  { id: 'conditional', label: '❓ Conditional' },
]

export function LeafAddMenu({ onSelect, onClose, anchor = 'below' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<SeriesInsertTarget>('same-visual')
  const [kind, setKind] = useState<DialogKind>('line')

  useEffect(() => {
    if (!ref.current) return

    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(kind, target)
    onClose()
  }

  return (
    <div
      ref={ref}
      className={`add-kind-menu leaf-add-menu nodrag nopan ${anchor}`}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className="leaf-add-columns">
        <div className="leaf-add-column">
          <div className="add-kind-menu-label">Where</div>
          {TARGETS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`leaf-add-option nodrag nopan ${target === item.id ? 'selected' : ''}`}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                setTarget(item.id)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="leaf-add-column">
          <div className="add-kind-menu-label">Kind</div>
          {KINDS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`leaf-add-option nodrag nopan ${kind === item.id ? 'selected' : ''}`}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                setKind(item.id)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="leaf-add-confirm nodrag nopan"
        onMouseDown={e => e.stopPropagation()}
        onClick={handleConfirm}
      >
        Add
      </button>
    </div>
  )
}
