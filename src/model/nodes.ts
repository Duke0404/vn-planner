import type { CompareOp } from './CompareOp'
import { nanoid } from '../lib/nanoid'

export type DialogKind = 'line' | 'choice' | 'conditional'

export interface Condition {
  variableId: string
  op: CompareOp
  value: number
}

export type VariableEffectOp = 'set' | 'add' | 'subtract'

export interface VariableEffect {
  variableId: string
  op: VariableEffectOp
  value: number
}

export interface ChoiceOption {
  id: string
  label: string
  effects: VariableEffect[]
  nextId: string | null
}

// ─── Base ────────────────────────────────────────────────────────────────────

export abstract class PlannerNode {
  id: string
  tagIds: string[]

  constructor(id?: string) {
    this.id = id ?? nanoid()
    this.tagIds = []
  }

  abstract toJSON(): Record<string, unknown>
}

// ─── Dialog hierarchy ────────────────────────────────────────────────────────

export abstract class Dialog extends PlannerNode {
  abstract readonly kind: DialogKind
  abstract getOutgoingIds(): (string | null)[]
}

export class LineDialog extends Dialog {
  readonly kind = 'line' as const
  speaker: string
  text: string
  nextId: string | null

  constructor(id?: string) {
    super(id)
    this.speaker = ''
    this.text = ''
    this.nextId = null
  }

  getOutgoingIds(): (string | null)[] {
    return [this.nextId]
  }

  toJSON(): Record<string, unknown> {
    return {
      kind: this.kind,
      id: this.id,
      tagIds: this.tagIds,
      speaker: this.speaker,
      text: this.text,
      nextId: this.nextId,
    }
  }
}

export class ChoiceDialog extends Dialog {
  readonly kind = 'choice' as const
  text: string
  options: ChoiceOption[]

  constructor(id?: string) {
    super(id)
    this.text = ''
    this.options = []
  }

  getOutgoingIds(): (string | null)[] {
    return this.options.map(o => o.nextId)
  }

  toJSON(): Record<string, unknown> {
    return {
      kind: this.kind,
      id: this.id,
      tagIds: this.tagIds,
      text: this.text,
      options: this.options,
    }
  }
}

export class ConditionalDialog extends Dialog {
  readonly kind = 'conditional' as const
  condition: Condition
  trueNextId: string | null
  falseNextId: string | null

  constructor(id?: string) {
    super(id)
    this.condition = { variableId: '', op: '<', value: 0 }
    this.trueNextId = null
    this.falseNextId = null
  }

  getOutgoingIds(): (string | null)[] {
    return [this.trueNextId, this.falseNextId]
  }

  toJSON(): Record<string, unknown> {
    return {
      kind: this.kind,
      id: this.id,
      tagIds: this.tagIds,
      condition: this.condition,
      trueNextId: this.trueNextId,
      falseNextId: this.falseNextId,
    }
  }
}

export function dialogFromJSON(raw: Record<string, unknown>): Dialog {
  const kind = raw.kind as DialogKind
  let d: Dialog
  if (kind === 'line') {
    const ld = new LineDialog(raw.id as string)
    ld.speaker = (raw.speaker as string) ?? ''
    ld.text = (raw.text as string) ?? ''
    ld.nextId = (raw.nextId as string | null) ?? null
    d = ld
  } else if (kind === 'choice') {
    const cd = new ChoiceDialog(raw.id as string)
    cd.text = (raw.text as string) ?? ''
    cd.options = (raw.options as ChoiceOption[]) ?? []
    d = cd
  } else {
    const cond = new ConditionalDialog(raw.id as string)
    cond.condition = (raw.condition as Condition) ?? {
      variableId: '',
      op: '<' as CompareOp,
      value: 0,
    }
    cond.trueNextId = (raw.trueNextId as string | null) ?? null
    cond.falseNextId = (raw.falseNextId as string | null) ?? null
    d = cond
  }
  d.tagIds = (raw.tagIds as string[]) ?? []
  return d
}

// ─── Visual ──────────────────────────────────────────────────────────────────

export class Visual extends PlannerNode {
  name: string
  dialogs: Dialog[]

  constructor(id?: string) {
    super(id)
    this.name = 'Visual'
    this.dialogs = []
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      tagIds: this.tagIds,
      name: this.name,
      dialogs: this.dialogs.map(d => d.toJSON()),
    }
  }

  static fromJSON(raw: Record<string, unknown>): Visual {
    const v = new Visual(raw.id as string)
    v.tagIds = (raw.tagIds as string[]) ?? []
    v.name = (raw.name as string) ?? 'Visual'
    v.dialogs = ((raw.dialogs as Record<string, unknown>[]) ?? []).map(dialogFromJSON)
    return v
  }
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export class Scene extends PlannerNode {
  name: string
  visuals: Visual[]

  constructor(id?: string) {
    super(id)
    this.name = 'Scene'
    this.visuals = []
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      tagIds: this.tagIds,
      name: this.name,
      visuals: this.visuals.map(v => v.toJSON()),
    }
  }

  static fromJSON(raw: Record<string, unknown>): Scene {
    const s = new Scene(raw.id as string)
    s.tagIds = (raw.tagIds as string[]) ?? []
    s.name = (raw.name as string) ?? 'Scene'
    s.visuals = ((raw.visuals as Record<string, unknown>[]) ?? []).map(Visual.fromJSON)
    return s
  }
}

// ─── Factory helpers ─────────────────────────────────────────────────────────

export function createBlankLineDialog(): LineDialog {
  return new LineDialog()
}

export function createBlankChoiceDialog(): ChoiceDialog {
  const blankA = createBlankLineDialog()
  const blankB = createBlankLineDialog()
  const d = new ChoiceDialog()
  d.options = [
    { id: nanoid(), label: 'Option A', effects: [], nextId: blankA.id },
    { id: nanoid(), label: 'Option B', effects: [], nextId: blankB.id },
  ]
  return d
}

export function createBlankConditionalDialog(): ConditionalDialog {
  return new ConditionalDialog()
}

export function createBlankDialog(kind: DialogKind): Dialog {
  if (kind === 'line') return createBlankLineDialog()
  if (kind === 'choice') return createBlankChoiceDialog()
  return createBlankConditionalDialog()
}

export function createBlankVisual(): Visual {
  const v = new Visual()
  const d = createBlankLineDialog()
  v.dialogs = [d]
  return v
}

export function createBlankScene(): Scene {
  const s = new Scene()
  const v = createBlankVisual()
  s.visuals = [v]
  return s
}

// ─── Entry dialog computation ─────────────────────────────────────────────────

export function getEntryDialogs(visual: Visual): Dialog[] {
  const targeted = new Set<string>()
  for (const d of visual.dialogs) {
    for (const id of d.getOutgoingIds()) {
      if (id) targeted.add(id)
    }
  }
  return visual.dialogs.filter(d => !targeted.has(d.id))
}

/** Dialog with no outgoing links — shows the series + affordance. */
export function isLeafDialog(dialog: Dialog): boolean {
  return !dialog.getOutgoingIds().some(id => id)
}

// ─── Incoming link count ──────────────────────────────────────────────────────

export function getIncomingCount(dialogId: string, visual: Visual): number {
  let count = 0
  for (const d of visual.dialogs) {
    for (const id of d.getOutgoingIds()) {
      if (id === dialogId) count++
    }
  }
  return count
}
