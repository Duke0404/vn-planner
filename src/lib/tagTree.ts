import type { Tag } from '../model/tags'

export function flattenTags(tags: Tag[]): Tag[] {
  const result: Tag[] = []
  function walk(ts: Tag[]) {
    for (const t of ts) {
      result.push(t)
      walk(t.children)
    }
  }
  walk(tags)
  return result
}

export function findTag(tags: Tag[], id: string): Tag | null {
  for (const t of tags) {
    if (t.id === id) return t
    const found = findTag(t.children, id)
    if (found) return found
  }
  return null
}

export function removeTag(tags: Tag[], id: string): Tag[] {
  return tags
    .filter(t => t.id !== id)
    .map(t => ({ ...t, children: removeTag(t.children, id) }))
}

export function updateTag(tags: Tag[], id: string, patch: Partial<Tag>): Tag[] {
  return tags.map(t => {
    if (t.id === id) return { ...t, ...patch }
    return { ...t, children: updateTag(t.children, id, patch) }
  })
}

export function addSubTag(tags: Tag[], parentId: string, child: Tag): Tag[] {
  return tags.map(t => {
    if (t.id === parentId) return { ...t, children: [...t.children, child] }
    return { ...t, children: addSubTag(t.children, parentId, child) }
  })
}
