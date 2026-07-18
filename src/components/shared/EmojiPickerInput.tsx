import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { EmojiClickData } from 'emoji-picker-react'

const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'))

interface Props {
  value: string
  onChange: (emoji: string) => void
  placeholder?: string
}

export function EmojiPickerInput({ value, onChange, placeholder = '🎭' }: Props) {
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

  function handleEmojiClick(data: EmojiClickData) {
    onChange(data.emoji)
    setOpen(false)
  }

  return (
    <div className="emoji-picker-input" ref={rootRef}>
      <button
        type="button"
        className="emoji-picker-trigger"
        aria-label="Pick emoji"
        title="Pick emoji"
        onClick={() => setOpen(v => !v)}
      >
        {value || placeholder}
      </button>
      {open && (
        <div className="emoji-picker-popover">
          <Suspense fallback={<div className="emoji-picker-loading">Loading…</div>}>
            <EmojiPickerPanel onEmojiClick={handleEmojiClick} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
