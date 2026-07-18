import { useRef, useEffect } from 'react'
import type { DialogKind } from '../../model/nodes'

interface Props {
  onSelect: (kind: DialogKind) => void
  onClose: () => void
  anchor?: 'below' | 'above'
}

export function AddKindMenu({ onSelect, onClose, anchor = 'below' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className={`add-kind-menu nodrag nopan ${anchor}`}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        className="nodrag nopan"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          onSelect('line')
          onClose()
        }}
      >
        💬 Line
      </button>
      <button
        type="button"
        className="nodrag nopan"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          onSelect('choice')
          onClose()
        }}
      >
        🔀 Choice
      </button>
      <button
        type="button"
        className="nodrag nopan"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          onSelect('conditional')
          onClose()
        }}
      >
        ❓ Conditional
      </button>
    </div>
  )
}
