import type { CompareOp } from '../model/CompareOp'
import {
  Dialog,
  Visual,
  Scene,
  getEntryDialogs,
  ChoiceDialog,
  ConditionalDialog,
} from '../model/nodes'
import type { Variable } from '../model/variables'
import type { VariableEffectOp } from '../model/nodes'
import { flattenVariables } from './variableTree'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Selection =
  | { type: 'scene'; sceneId: string }
  | { type: 'visual'; sceneId: string; visualId: string }
  | { type: 'dialog'; sceneId: string; visualId: string; dialogId: string }

/** A contiguous range segment [min, max]. Disjoint sets represented as multiple segments. */
export interface RangeSegment {
  min: number
  max: number
}

export interface ComputedRange {
  variableId: string
  label: string
  segments: RangeSegment[]
}

type VarRanges = Map<string, RangeSegment[]>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function mergeSegments(segs: RangeSegment[][]): RangeSegment[] {
  const all = segs.flat()
  if (!all.length) return []
  const sorted = [...all].sort((a, b) => a.min - b.min)
  const merged: RangeSegment[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i].min <= last.max + 1) {
      last.max = Math.max(last.max, sorted[i].max)
    } else {
      merged.push({ ...sorted[i] })
    }
  }
  return merged
}

function unionRanges(a: VarRanges, b: VarRanges): VarRanges {
  const result = new Map<string, RangeSegment[]>()
  const keys = new Set([...a.keys(), ...b.keys()])
  for (const k of keys) {
    const segsA = a.get(k) ?? []
    const segsB = b.get(k) ?? []
    result.set(k, mergeSegments([segsA, segsB]))
  }
  return result
}

function cloneRanges(r: VarRanges): VarRanges {
  const out = new Map<string, RangeSegment[]>()
  for (const [k, v] of r) out.set(k, v.map(s => ({ ...s })))
  return out
}

function seedRanges(variables: Variable[]): VarRanges {
  const flat = flattenVariables(variables)
  const m = new Map<string, RangeSegment[]>()
  for (const v of flat) {
    m.set(v.id, [{ min: v.min, max: v.max }])
  }
  return m
}

// ─── Condition narrowing ──────────────────────────────────────────────────────

function narrowTrue(segs: RangeSegment[], op: CompareOp, v: number): RangeSegment[] {
  const result: RangeSegment[] = []
  for (const seg of segs) {
    if (op === '<') {
      if (seg.min < v) result.push({ min: seg.min, max: Math.min(seg.max, v - 1) })
    } else if (op === '<=') {
      if (seg.min <= v) result.push({ min: seg.min, max: Math.min(seg.max, v) })
    } else if (op === '==') {
      if (seg.min <= v && v <= seg.max) result.push({ min: v, max: v })
    } else if (op === '!=') {
      if (seg.min < v) result.push({ min: seg.min, max: Math.min(seg.max, v - 1) })
      if (seg.max > v) result.push({ min: Math.max(seg.min, v + 1), max: seg.max })
    } else if (op === '>=') {
      if (seg.max >= v) result.push({ min: Math.max(seg.min, v), max: seg.max })
    } else if (op === '>') {
      if (seg.max > v) result.push({ min: Math.max(seg.min, v + 1), max: seg.max })
    }
  }
  return result
}

function narrowFalse(segs: RangeSegment[], op: CompareOp, v: number): RangeSegment[] {
  const opposite: Record<CompareOp, CompareOp> = {
    '<': '>=',
    '<=': '>',
    '==': '!=',
    '!=': '==',
    '>=': '<',
    '>': '<=',
  }
  return narrowTrue(segs, opposite[op], v)
}

// ─── Effect application ───────────────────────────────────────────────────────

function applyEffect(
  ranges: VarRanges,
  variableId: string,
  op: VariableEffectOp,
  value: number,
  variable: Variable | undefined,
): VarRanges {
  if (!variableId) return ranges
  const cloned = cloneRanges(ranges)
  const globalMin = variable?.min ?? -Infinity
  const globalMax = variable?.max ?? Infinity

  if (op === 'set') {
    const clamped = clamp(value, globalMin, globalMax)
    cloned.set(variableId, [{ min: clamped, max: clamped }])
  } else {
    const delta = op === 'add' ? value : -value
    const current = cloned.get(variableId) ?? []
    cloned.set(
      variableId,
      current.map(s => ({
        min: clamp(s.min + delta, globalMin, globalMax),
        max: clamp(s.max + delta, globalMin, globalMax),
      })),
    )
  }
  return cloned
}

// ─── Walk ─────────────────────────────────────────────────────────────────────

export function walkVisual(
  visual: Visual,
  seed: VarRanges,
  variables: Variable[],
): Map<string, VarRanges> {
  const flat = flattenVariables(variables)
  const varById = new Map(flat.map(v => [v.id, v]))
  const dialogById = new Map(visual.dialogs.map(d => [d.id, d]))

  const inbound = new Map<string, VarRanges>()

  function visit(dialogId: string, incoming: VarRanges, visited: Set<string>) {
    if (visited.has(dialogId)) return
    visited.add(dialogId)
    const existing = inbound.get(dialogId)
    const merged = existing ? unionRanges(existing, incoming) : incoming
    inbound.set(dialogId, merged)

    const d = dialogById.get(dialogId)
    if (!d) return

    if (d.kind === 'line') {
      const ld = d as import('../model/nodes').LineDialog
      if (ld.nextId) visit(ld.nextId, cloneRanges(merged), new Set(visited))
    } else if (d.kind === 'choice') {
      const cd = d as ChoiceDialog
      for (const opt of cd.options) {
        let branch = cloneRanges(merged)
        for (const eff of opt.effects) {
          branch = applyEffect(branch, eff.variableId, eff.op, eff.value, varById.get(eff.variableId))
        }
        if (opt.nextId) visit(opt.nextId, branch, new Set(visited))
      }
    } else if (d.kind === 'conditional') {
      const cd = d as ConditionalDialog
      const { variableId, op, value } = cd.condition
      const currentSegs = merged.get(variableId) ?? []

      const trueBranch = cloneRanges(merged)
      trueBranch.set(variableId, narrowTrue(currentSegs, op, value))
      const falseBranch = cloneRanges(merged)
      falseBranch.set(variableId, narrowFalse(currentSegs, op, value))

      if (cd.trueNextId) visit(cd.trueNextId, trueBranch, new Set(visited))
      if (cd.falseNextId) visit(cd.falseNextId, falseBranch, new Set(visited))
    }
  }

  const entries = getEntryDialogs(visual)
  for (const entry of entries) {
    visit(entry.id, cloneRanges(seed), new Set())
  }

  return inbound
}

function projectDialog(dialog: Dialog, inbound: VarRanges, variables: Variable[]): VarRanges {
  const flat = flattenVariables(variables)
  const varById = new Map(flat.map(v => [v.id, v]))

  if (dialog.kind === 'line') {
    return inbound
  } else if (dialog.kind === 'choice') {
    const cd = dialog as ChoiceDialog
    if (!cd.options.length) return inbound
    const branches: VarRanges[] = cd.options.map(opt => {
      let branch = cloneRanges(inbound)
      for (const eff of opt.effects) {
        branch = applyEffect(branch, eff.variableId, eff.op, eff.value, varById.get(eff.variableId))
      }
      return branch
    })
    return branches.reduce(unionRanges)
  } else if (dialog.kind === 'conditional') {
    const cd = dialog as ConditionalDialog
    const { variableId, op, value } = cd.condition
    const segs = inbound.get(variableId) ?? []
    const trueRanges = cloneRanges(inbound)
    trueRanges.set(variableId, narrowTrue(segs, op, value))
    const falseRanges = cloneRanges(inbound)
    falseRanges.set(variableId, narrowFalse(segs, op, value))
    return unionRanges(trueRanges, falseRanges)
  }
  return inbound
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getRangesForSelection(
  selection: Selection,
  scenes: Scene[],
  variables: Variable[],
): ComputedRange[] {
  const flat = flattenVariables(variables)
  const seed = seedRanges(variables)

  function toComputed(ranges: VarRanges): ComputedRange[] {
    return flat.map(v => ({
      variableId: v.id,
      label: `${v.emoji ? v.emoji + ' ' : ''}${v.name}`,
      segments: ranges.get(v.id) ?? [{ min: v.min, max: v.max }],
    }))
  }

  const scene = scenes.find(s => s.id === selection.sceneId)
  if (!scene) return toComputed(seed)

  if (selection.type === 'scene') {
    let unionAll: VarRanges | null = null
    for (const visual of scene.visuals) {
      const inbound = walkVisual(visual, seed, variables)
      let visualUnion: VarRanges | null = null
      for (const d of visual.dialogs) {
        const r = inbound.get(d.id)
        if (!r) continue
        const proj = projectDialog(d, r, variables)
        visualUnion = visualUnion ? unionRanges(visualUnion, proj) : proj
      }
      if (visualUnion) {
        unionAll = unionAll ? unionRanges(unionAll, visualUnion) : visualUnion
      }
    }
    return toComputed(unionAll ?? seed)
  }

  if (selection.type === 'visual') {
    const visual = scene.visuals.find(v => v.id === selection.visualId)
    if (!visual) return toComputed(seed)
    const inbound = walkVisual(visual, seed, variables)
    let visualUnion: VarRanges | null = null
    for (const d of visual.dialogs) {
      const r = inbound.get(d.id)
      if (!r) continue
      const proj = projectDialog(d, r, variables)
      visualUnion = visualUnion ? unionRanges(visualUnion, proj) : proj
    }
    return toComputed(visualUnion ?? seed)
  }

  if (selection.type === 'dialog') {
    const visual = scene.visuals.find(v => v.id === selection.visualId)
    if (!visual) return toComputed(seed)
    const inbound = walkVisual(visual, seed, variables)
    const dialog = visual.dialogs.find(d => d.id === selection.dialogId)
    if (!dialog) return toComputed(seed)
    const r = inbound.get(dialog.id) ?? seed
    const proj = projectDialog(dialog, r, variables)
    return toComputed(proj)
  }

  return toComputed(seed)
}

export function isBranchImpossible(segs: RangeSegment[]): boolean {
  return segs.length === 0
}

export function getConditionalReachability(
  dialog: ConditionalDialog,
  inbound: VarRanges,
): { trueReachable: boolean; falseReachable: boolean } {
  const { variableId, op, value } = dialog.condition
  const segs = inbound.get(variableId) ?? []
  return {
    trueReachable: narrowTrue(segs, op, value).length > 0,
    falseReachable: narrowFalse(segs, op, value).length > 0,
  }
}
