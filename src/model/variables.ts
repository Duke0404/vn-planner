import { nanoid } from '../lib/nanoid'

export interface Variable {
  id: string
  name: string
  emoji: string
  min: number
  max: number
  children: Variable[]
}

export function createVariable(name = 'variable', min = 0, max = 0): Variable {
  return { id: nanoid(), name, emoji: '', min, max, children: [] }
}
