import { useState } from 'react'
import type { Variable } from '../../model/variables'
import { usePlannerStore } from '../../store/usePlannerStore'
import { EmojiPickerInput } from '../shared/EmojiPickerInput'

interface NodeProps {
  variable: Variable
  depth: number
}

function VariableNode({ variable, depth }: NodeProps) {
  const updateVariable = usePlannerStore(s => s.updateVariable)
  const deleteVariable = usePlannerStore(s => s.deleteVariable)
  const addSubVariable = usePlannerStore(s => s.addSubVariable)
  const [error, setError] = useState('')

  function handleDelete() {
    const msg = deleteVariable(variable.id)
    if (msg) setError(msg)
    else setError('')
  }

  return (
    <div style={{ paddingLeft: depth * 16 }} className="variable-node">
      <div className="variable-row">
        <EmojiPickerInput
          value={variable.emoji}
          onChange={emoji => updateVariable(variable.id, { emoji })}
        />
        <input
          type="text"
          value={variable.name}
          onChange={e => updateVariable(variable.id, { name: e.target.value })}
          placeholder="Name"
          style={{ flex: 1 }}
        />
        <input
          type="number"
          value={variable.min}
          onChange={e => updateVariable(variable.id, { min: Number(e.target.value) })}
          title="Min"
          style={{ width: 60 }}
        />
        <span className="var-sep">–</span>
        <input
          type="number"
          value={variable.max}
          onChange={e => updateVariable(variable.id, { max: Number(e.target.value) })}
          title="Max"
          style={{ width: 60 }}
        />
        <button
          type="button"
          className="icon-btn"
          title="Add sub-variable"
          onClick={() => addSubVariable(variable.id)}
        >
          +child
        </button>
        <button
          type="button"
          className="icon-btn danger"
          title="Delete variable"
          onClick={handleDelete}
        >
          ×
        </button>
      </div>
      {error && <div className="var-error">{error}</div>}
      {variable.children.map(child => (
        <VariableNode key={child.id} variable={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function VariableEditor() {
  const variables = usePlannerStore(s => s.project.variables)
  const addRootVariable = usePlannerStore(s => s.addRootVariable)

  return (
    <div className="variable-editor">
      <div className="editor-section-title">Variables</div>
      {variables.map(v => (
        <VariableNode key={v.id} variable={v} depth={0} />
      ))}
      <button className="add-btn" onClick={addRootVariable}>
        + Add variable
      </button>
    </div>
  )
}
