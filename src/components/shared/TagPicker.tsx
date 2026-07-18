import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenTags } from '../../lib/tagTree'

interface Props {
  value: string[]
  onChange: (ids: string[]) => void
}

export function TagPicker({ value, onChange }: Props) {
  const tags = usePlannerStore(s => s.project.tags)
  const flat = flattenTags(tags)

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  if (!flat.length) {
    return <span className="tag-picker-empty">No tags — add in Config</span>
  }

  return (
    <div className="tag-picker">
      {flat.map(t => (
        <button
          key={t.id}
          type="button"
          className={`tag-chip ${value.includes(t.id) ? 'selected' : ''}`}
          onClick={() => toggle(t.id)}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
