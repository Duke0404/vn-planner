import { Scene } from './nodes'
import type { Variable } from './variables'
import type { Tag } from './tags'
import type { Speaker } from './speakers'
import { normalizeProject } from '../lib/projectMigration'

export interface Project {
  variables: Variable[]
  tags: Tag[]
  speakers: Speaker[]
  scenes: Scene[]
}

export function projectToJSON(p: Project): Record<string, unknown> {
  return {
    variables: p.variables,
    tags: p.tags,
    speakers: p.speakers,
    scenes: p.scenes.map(s => s.toJSON()),
  }
}

export function projectFromJSON(raw: Record<string, unknown>): Project {
  return normalizeProject(raw)
}
