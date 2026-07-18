import { nanoid } from '../lib/nanoid'
import { DEFAULT_TAG_COLOR } from './colors'

export interface Tag {
  id: string
  name: string
  color: string
  children: Tag[]
}

export function createTag(name = 'tag', color = DEFAULT_TAG_COLOR): Tag {
  return { id: nanoid(), name, color, children: [] }
}
