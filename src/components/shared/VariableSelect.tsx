import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenVariables, getVariablePath, formatVariableRangeLabel } from '../../lib/variableTree'

interface Props {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

function optionIndent(depth: number): string {
  return depth > 0 ? '\u2003'.repeat(depth) : ''
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
      {flat.map(v => {
        const path = getVariablePath(variables, v.id) ?? [v]
        const depth = path.length - 1
        return (
          <option key={v.id} value={v.id}>
            {optionIndent(depth)}
            {formatVariableRangeLabel(path)}
          </option>
        )
      })}
    </select>
  )
}
