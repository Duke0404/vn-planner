export const NARRATION_COLOR = '#8b8b8b'
export const DEFAULT_TAG_COLOR = '#5b8def'
export const DEFAULT_SPEAKER_COLOR = '#c47aff'

export const COLOR_PALETTE = [
  // Neutrals
  '#52525b',
  '#6b7280',
  '#78716c',
  '#8b8b8b',
  '#9ca3af',
  '#a8a29e',
  '#b4bcc8',
  '#c8cdd8',
  // Reds & roses
  '#991b1b',
  '#dc2626',
  '#ef4444',
  '#ef5b5b',
  '#f87171',
  '#fb7185',
  '#e85d9a',
  '#f472b6',
  // Oranges & yellows
  '#c2410c',
  '#ea580c',
  '#f97316',
  '#ef9a5b',
  '#fb923c',
  '#f59e0b',
  '#eab308',
  '#e5c07b',
  // Greens
  '#166534',
  '#16a34a',
  '#22c55e',
  '#6bc96b',
  '#4ade80',
  '#84cc16',
  '#a3e635',
  '#65a30d',
  // Teals & cyans
  '#0f766e',
  '#0d9488',
  '#14b8a6',
  '#5bc9b8',
  '#2dd4bf',
  '#06b6d4',
  '#5bb8c9',
  '#22d3ee',
  // Blues & indigos
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#5b8def',
  '#60a5fa',
  '#6366f1',
  '#7b6bef',
  '#0ea5e9',
  // Purples & magentas
  '#6b21a8',
  '#7c3aed',
  '#8b5cf6',
  '#c47aff',
  '#a78bfa',
  '#9333ea',
  '#d946ef',
  '#c026d3',
] as const

export type PaletteColor = (typeof COLOR_PALETTE)[number]

export function textColorForBackground(hex: string): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return '#ffffff'
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff'
}

export function chipStyle(color: string, selected: boolean): { backgroundColor: string; color: string; border: string } {
  return {
    backgroundColor: selected ? color : `${color}26`,
    color: selected ? textColorForBackground(color) : color,
    border: `1px solid ${color}`,
  }
}
