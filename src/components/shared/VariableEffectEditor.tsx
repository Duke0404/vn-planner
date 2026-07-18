import type { VariableEffect, VariableEffectOp } from '../../model/nodes'
import { VariableSelect } from './VariableSelect'

interface Props {
  effects: VariableEffect[]
  onChange: (effects: VariableEffect[]) => void
}

export function VariableEffectEditor({ effects, onChange }: Props) {
  function addEffect() {
    onChange([...effects, { variableId: '', op: 'add', value: 1 }])
  }

  function update(i: number, patch: Partial<VariableEffect>) {
    onChange(effects.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  function remove(i: number) {
    onChange(effects.filter((_, idx) => idx !== i))
  }

  return (
    <div className="effect-editor">
      {effects.map((eff, i) => (
        <div key={i} className="effect-row">
          <VariableSelect
            value={eff.variableId}
            onChange={id => update(i, { variableId: id })}
            placeholder="Variable…"
          />
          <select
            value={eff.op}
            onChange={e => update(i, { op: e.target.value as VariableEffectOp })}
          >
            <option value="add">+= (add)</option>
            <option value="subtract">-= (subtract)</option>
            <option value="set">= (set)</option>
          </select>
          <input
            type="number"
            value={eff.value}
            onChange={e => update(i, { value: Number(e.target.value) })}
            style={{ width: 60 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="icon-btn danger"
            title="Remove effect"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="add-btn" onClick={addEffect}>
        + Add effect
      </button>
    </div>
  )
}
