import { useMemo } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenSpeakers } from '../../lib/speakerTree'
import { NARRATION_COLOR } from '../../model/colors'

interface Props {
  value: string | null
  onChange: (speakerId: string | null) => void
}

export function SpeakerPicker({ value, onChange }: Props) {
  const speakers = usePlannerStore(s => s.project.speakers)
  const flat = useMemo(() => flattenSpeakers(speakers), [speakers])
  const selected = value ? flat.find(s => s.id === value) : null
  const swatchColor = selected?.color ?? NARRATION_COLOR

  return (
    <div className="speaker-picker">
      <span
        className="speaker-color-swatch"
        style={{ backgroundColor: swatchColor }}
        title={selected?.name ?? 'Narration'}
      />
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="speaker-select"
      >
        <option value="">Narration</option>
        {flat.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!flat.length && (
        <span className="speaker-picker-hint">Add speakers in Config</span>
      )}
    </div>
  )
}
