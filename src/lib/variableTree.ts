import type { Variable } from '../model/variables'
import type { Scene } from '../model/nodes'
import { ChoiceDialog, ConditionalDialog } from '../model/nodes'

/** Flat list of all variables in depth-first order */
export function flattenVariables(variables: Variable[]): Variable[] {
  const result: Variable[] = []
  function walk(vs: Variable[]) {
    for (const v of vs) {
      result.push(v)
      walk(v.children)
    }
  }
  walk(variables)
  return result
}

/** Find a variable by ID in the tree */
export function findVariable(variables: Variable[], id: string): Variable | null {
  for (const v of variables) {
    if (v.id === id) return v
    const found = findVariable(v.children, id)
    if (found) return found
  }
  return null
}

/** Path from root to the variable with the given ID */
export function getVariablePath(variables: Variable[], id: string): Variable[] | null {
  for (const v of variables) {
    if (v.id === id) return [v]
    const childPath = getVariablePath(v.children, id)
    if (childPath) return [v, ...childPath]
  }
  return null
}

/** Label for variable range display: root uses emoji + name; nested uses emoji chain + names joined with " - " */
export function formatVariableRangeLabel(path: Variable[]): string {
  if (path.length === 1) {
    const v = path[0]
    return `${v.emoji ? `${v.emoji} ` : ''}${v.name}`
  }
  const emojiPart = path.map(v => v.emoji).filter(Boolean).join(' ')
  const namePart = path.map(v => v.name).join(' - ')
  return emojiPart ? `${emojiPart} ${namePart}` : namePart
}

/** Collect all variable IDs referenced by effects and conditions in the project */
export function collectReferencedVariableIds(scenes: Scene[]): Set<string> {
  const ids = new Set<string>()
  for (const scene of scenes) {
    for (const visual of scene.visuals) {
      for (const dialog of visual.dialogs) {
        if (dialog.kind === 'choice') {
          for (const opt of (dialog as ChoiceDialog).options) {
            for (const eff of opt.effects) ids.add(eff.variableId)
          }
        } else if (dialog.kind === 'conditional') {
          const cond = (dialog as ConditionalDialog).condition.variableId
          if (cond) ids.add(cond)
        }
      }
    }
  }
  return ids
}

/** Remove a variable by ID (returns new array; fails silently if referenced) */
export function removeVariable(variables: Variable[], id: string): Variable[] {
  return variables
    .filter(v => v.id !== id)
    .map(v => ({ ...v, children: removeVariable(v.children, id) }))
}

/** Update a variable in the tree by ID */
export function updateVariable(
  variables: Variable[],
  id: string,
  patch: Partial<Variable>,
): Variable[] {
  return variables.map(v => {
    if (v.id === id) return { ...v, ...patch }
    return { ...v, children: updateVariable(v.children, id, patch) }
  })
}

/** Add a sub-variable to a parent variable */
export function addSubVariable(
  variables: Variable[],
  parentId: string,
  child: Variable,
): Variable[] {
  return variables.map(v => {
    if (v.id === parentId) return { ...v, children: [...v.children, child] }
    return { ...v, children: addSubVariable(v.children, parentId, child) }
  })
}
