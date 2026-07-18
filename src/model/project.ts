import { Scene } from './nodes'
import type { Variable } from './variables'
import type { Tag } from './tags'

export interface Project {
  variables: Variable[]
  tags: Tag[]
  scenes: Scene[]
}

export function projectToJSON(p: Project): Record<string, unknown> {
  return {
    variables: p.variables,
    tags: p.tags,
    scenes: p.scenes.map(s => s.toJSON()),
  }
}

export function projectFromJSON(raw: Record<string, unknown>): Project {
  return {
    variables: (raw.variables as Variable[]) ?? [],
    tags: (raw.tags as Tag[]) ?? [],
    scenes: ((raw.scenes as Record<string, unknown>[]) ?? []).map(Scene.fromJSON),
  }
}
