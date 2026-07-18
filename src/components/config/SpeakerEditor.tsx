import { useState } from 'react'
import type { Speaker } from '../../model/speakers'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ColorInput } from '../shared/ColorInput'

interface NodeProps {
  speaker: Speaker
  depth: number
}

function SpeakerNode({ speaker, depth }: NodeProps) {
  const updateSpeaker = usePlannerStore(s => s.updateSpeaker)
  const deleteSpeaker = usePlannerStore(s => s.deleteSpeaker)
  const addSubSpeaker = usePlannerStore(s => s.addSubSpeaker)
  const [error, setError] = useState('')

  function handleDelete() {
    const msg = deleteSpeaker(speaker.id)
    if (msg) setError(msg)
    else setError('')
  }

  return (
    <div style={{ paddingLeft: depth * 16 }} className="speaker-node">
      <div className="speaker-row">
        <ColorInput
          value={speaker.color}
          onChange={color => updateSpeaker(speaker.id, { color })}
          title="Speaker color"
        />
        <input
          type="text"
          value={speaker.name}
          onChange={e => updateSpeaker(speaker.id, { name: e.target.value })}
          placeholder="Speaker name"
          style={{ flex: 1 }}
        />
        <button type="button" className="icon-btn" onClick={() => addSubSpeaker(speaker.id)}>
          +sub
        </button>
        <button type="button" className="icon-btn danger" onClick={handleDelete}>
          ×
        </button>
      </div>
      {error && <div className="var-error">{error}</div>}
      {speaker.children.map(child => (
        <SpeakerNode key={child.id} speaker={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function SpeakerEditor() {
  const speakers = usePlannerStore(s => s.project.speakers)
  const addRootSpeaker = usePlannerStore(s => s.addRootSpeaker)

  return (
    <div className="speaker-editor">
      <div className="editor-section-title">Speakers</div>
      <p className="config-hint">No speaker selected on a line means narration (grey).</p>
      {speakers.map(s => (
        <SpeakerNode key={s.id} speaker={s} depth={0} />
      ))}
      <button className="add-btn" onClick={addRootSpeaker}>
        + Add speaker
      </button>
    </div>
  )
}
