import { DIALOG_WIDTH } from './dialogNodeLayout'

export const DESCRIPTION_FONT_SIZE = 11
export const DESCRIPTION_LINE_HEIGHT = Math.ceil(DESCRIPTION_FONT_SIZE * 1.45)
export const DESCRIPTION_MAX_LINES = 2
export const META_PADDING_Y = 12
export const META_GAP = 6
export const META_HORIZONTAL_PAD = 24
export const TAGS_ROW_HEIGHT = 22

const NODE_INNER_WIDTH = DIALOG_WIDTH - META_HORIZONTAL_PAD

export function estimateDescriptionLineCount(description: string): number {
  const trimmed = description.trim()
  if (!trimmed) return 0

  const charsPerLine = Math.max(
    12,
    Math.floor(NODE_INNER_WIDTH / (DESCRIPTION_FONT_SIZE * 0.55)),
  )
  let lines = 0
  for (const segment of trimmed.split('\n')) {
    lines += Math.max(1, Math.ceil(segment.length / charsPerLine))
  }
  return Math.min(DESCRIPTION_MAX_LINES, lines)
}

export function estimateDescriptionHeight(description: string | undefined): number {
  if (!description?.trim()) return 0
  return DESCRIPTION_LINE_HEIGHT * estimateDescriptionLineCount(description)
}

export function estimateMetaHeight(description: string | undefined, tagCount: number): number {
  const descHeight = estimateDescriptionHeight(description)
  const hasDesc = descHeight > 0
  const hasTags = tagCount > 0
  if (!hasDesc && !hasTags) return 0

  let height = META_PADDING_Y
  if (hasDesc) height += descHeight
  if (hasTags) {
    if (hasDesc) height += META_GAP
    height += TAGS_ROW_HEIGHT
  }
  return height
}
