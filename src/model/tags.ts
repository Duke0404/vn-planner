import { nanoid } from '../lib/nanoid'

export interface Tag {
  id: string
  name: string
  children: Tag[]
}

export function createTag(name = 'tag'): Tag {
  return { id: nanoid(), name, children: [] }
}
