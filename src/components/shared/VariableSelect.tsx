import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenVariables } from '../../lib/variableTree'

interface Props {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function VariableSelect({ value, onChange, placeholder = 'Select variable…' }: Props) {
  const variables = usePlannerStore(s => s.project.variables)
  const flat = flattenVariables(variables)

  return (
    <select
      className="var-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {flat.map(v => (
        <option key={v.id} value={v.id}>
          {v.emoji ? `${v.emoji} ` : ''}{v.name}
        </option>
      ))}
    </select>
  )
}
