import { useMemo } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { flattenTags } from '../../lib/tagTree'
import { chipStyle } from '../../model/colors'

interface Props {
  tagIds: string[]
  small?: boolean
}

export function TagChipList({ tagIds, small = false }: Props) {
  const tags = usePlannerStore(s => s.project.tags)
  const byId = useMemo(() => new Map(flattenTags(tags).map(t => [t.id, t])), [tags])

  if (!tagIds.length) return null

  return (
    <>
      {tagIds.map(id => {
        const tag = byId.get(id)
        return (
          <span
            key={id}
            className={`tag-chip ${small ? 'small' : ''}`}
            style={chipStyle(tag?.color ?? '#5b8def', true)}
          >
            {tag?.name ?? id}
          </span>
        )
      })}
    </>
  )
}
