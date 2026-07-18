import type { Dialog, LineDialog, ChoiceDialog, ConditionalDialog } from '../model/nodes'
import type { Speaker } from '../model/speakers'
import { findSpeaker } from './speakerTree'
import { stripMarkdown } from './stripMarkdown'

export const DIALOG_WIDTH = 320
export const DIALOG_MIN_HEIGHT = 32
export const DIALOG_PADDING_X = 24
export const DIALOG_PADDING_Y = 14
export const DIALOG_PREVIEW_FONT = 12
export const DIALOG_PREVIEW_LINE = Math.ceil(DIALOG_PREVIEW_FONT * 1.45)
export const DIALOG_PREVIEW_INNER_WIDTH = DIALOG_WIDTH - DIALOG_PADDING_X - 48
export const DIALOG_TAGS_ROW = 22

export function getDialogMarkdownSource(dialog: Dialog): string | null {
  if (dialog.kind === 'line') {
    const text = (dialog as LineDialog).text.trim()
    return text || null
  }
  if (dialog.kind === 'choice') {
    const text = (dialog as ChoiceDialog).text.trim()
    return text || null
  }
  return null
}

export function getDialogPreviewText(dialog: Dialog, speakers: Speaker[]): string {
  if (dialog.kind === 'line') {
    const d = dialog as LineDialog
    const speaker = d.speakerId ? findSpeaker(speakers, d.speakerId) : null
    const prefix = speaker ? `${speaker.name}: ` : ''
    const text = prefix + d.text
    return text.trim() ? text : '(empty)'
  }
  if (dialog.kind === 'choice') {
    const d = dialog as ChoiceDialog
    if (d.text.trim()) return d.text
    return `${d.options.length} options`
  }
  if (dialog.kind === 'conditional') {
    const cd = dialog as ConditionalDialog
    return `if var ${cd.condition.op} ${cd.condition.value}`
  }
  return ''
}

export function estimatePreviewLineCount(text: string): number {
  const trimmed = stripMarkdown(text).trim()
  if (!trimmed) return 1

  const charsPerLine = Math.max(
    8,
    Math.floor(DIALOG_PREVIEW_INNER_WIDTH / (DIALOG_PREVIEW_FONT * 0.55)),
  )
  let lines = 0
  for (const segment of trimmed.split('\n')) {
    lines += Math.max(1, Math.ceil(segment.length / charsPerLine))
  }
  return lines
}

export function estimateDialogHeight(dialog: Dialog, speakers: Speaker[]): number {
  const lines = estimatePreviewLineCount(getDialogPreviewText(dialog, speakers))
  let height = DIALOG_PADDING_Y + lines * DIALOG_PREVIEW_LINE
  if (dialog.tagIds.length > 0) height += 4 + DIALOG_TAGS_ROW
  return Math.max(DIALOG_MIN_HEIGHT, height)
}
