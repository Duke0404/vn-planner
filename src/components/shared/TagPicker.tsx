import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenTags } from '../../lib/tagTree'
import { chipStyle } from '../../model/colors'

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
      {flat.map(t => {
        const selected = value.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            className={`tag-chip ${selected ? 'selected' : ''}`}
            style={chipStyle(t.color, selected)}
            onClick={() => toggle(t.id)}
          >
            {t.name}
          </button>
        )
      })}
    </div>
  )
}
