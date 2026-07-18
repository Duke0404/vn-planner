import { useEffect, useRef, useState } from 'react'
import { COLOR_PALETTE } from '../../model/colors'

interface Props {
  value: string
  onChange: (color: string) => void
  title?: string
}

export function ColorInput({ value, onChange, title = 'Color' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function handleSelect(color: string) {
    onChange(color)
    setOpen(false)
  }

  return (
    <div className="color-input" ref={rootRef}>
      <button
        type="button"
        className="color-input-trigger"
        style={{ backgroundColor: value }}
        title={title}
        aria-label={title}
        onClick={() => setOpen(v => !v)}
      />
      {open && (
        <div className="color-palette-popover" role="listbox" aria-label={title}>
          {COLOR_PALETTE.map(color => (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={color === value}
              className={`color-palette-swatch ${color === value ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              title={color}
              onClick={() => handleSelect(color)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
