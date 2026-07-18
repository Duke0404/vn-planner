import {
  Scene,
  Visual,
  Dialog,
  type DialogKind,
  LineDialog,
  ChoiceDialog,
  ConditionalDialog,
  createBlankDialog,
  createBlankLineDialog,
  createBlankVisual,
  createBlankScene,
  getIncomingCount,
} from '../model/nodes'
import type { Project } from '../model/project'
import { nanoid } from './nanoid'

export type SeriesInsertTarget = 'same-visual' | 'new-visual' | 'new-scene'

export interface SeriesInsertResult {
  scenes: Scene[]
  newSceneId?: string
  newVisualId?: string
}

function wireLeafToNext(after: Dialog, newDialogId: string): void {
  if (after.kind === 'line') {
    ;(after as LineDialog).nextId = newDialogId
  } else if (after.kind === 'choice') {
    const cd = after as ChoiceDialog
    for (const opt of cd.options) {
      if (!opt.nextId) opt.nextId = newDialogId
    }
  } else if (after.kind === 'conditional') {
    const cond = after as ConditionalDialog
    if (!cond.trueNextId) cond.trueNextId = newDialogId
    else if (!cond.falseNextId) cond.falseNextId = newDialogId
  }
}

function createDialogBundle(kind: DialogKind): { dialog: Dialog; extras: Dialog[] } {
  if (kind === 'choice') {
    const blankA = createBlankLineDialog()
    const blankB = createBlankLineDialog()
    const d = new ChoiceDialog()
    d.options = [
      { id: nanoid(), label: 'Option A', effects: [], nextId: blankA.id },
      { id: nanoid(), label: 'Option B', effects: [], nextId: blankB.id },
    ]
    return { dialog: d, extras: [blankA, blankB] }
  }
  return { dialog: createBlankDialog(kind), extras: [] }
}

// ─── Scene mutations ──────────────────────────────────────────────────────────

export function updateScene(scenes: Scene[], id: string, patch: Partial<Scene>): Scene[] {
  return scenes.map(s => {
    if (s.id !== id) return s
    const next = Scene.fromJSON(s.toJSON())
    Object.assign(next, patch)
    return next
  })
}

export function addScene(scenes: Scene[]): Scene[] {
  return [...scenes, createBlankScene()]
}

export function removeScene(scenes: Scene[], id: string): Scene[] {
  if (scenes.length <= 1) {
    return [createBlankScene()]
  }
  return scenes.filter(s => s.id !== id).map(s => Scene.fromJSON(s.toJSON()))
}

// ─── Visual mutations ─────────────────────────────────────────────────────────

export function addVisualToScene(scenes: Scene[], sceneId: string): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = [...next.visuals, createBlankVisual()]
    return next
  })
}

export function removeVisualFromScene(scenes: Scene[], sceneId: string, visualId: string): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    if (next.visuals.length <= 1) {
      next.visuals = [createBlankVisual()]
    } else {
      next.visuals = next.visuals.filter(v => v.id !== visualId)
    }
    return next
  })
}

export function updateVisual(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  patch: Partial<Visual>,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      Object.assign(v, patch)
      return v
    })
    return next
  })
}

// ─── Dialog mutations ─────────────────────────────────────────────────────────

export function addDialogParallel(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  kind: DialogKind,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      const { dialog: d, extras } = createDialogBundle(kind)
      v.dialogs = [...v.dialogs, d, ...extras]
      return v
    })
    return next
  })
}

export function addDialogSeries(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  sourceDialogId: string,
  targetDialogId: string,
  kind: DialogKind,
): Scene[] {
  return insertDialogAfter(scenes, sceneId, visualId, sourceDialogId, kind, targetDialogId)
}

/** Insert a new dialog in series after a leaf (or splice when mid-chain). */
export function insertDialogSeriesAfter(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  afterDialogId: string,
  kind: DialogKind,
  target: SeriesInsertTarget = 'same-visual',
): SeriesInsertResult {
  if (target === 'same-visual') {
    return { scenes: insertDialogAfter(scenes, sceneId, visualId, afterDialogId, kind) }
  }

  const { dialog: newDialog, extras } = createDialogBundle(kind)

  if (target === 'new-visual') {
    let newVisualId = ''
    const updated = scenes.map(s => {
      if (s.id !== sceneId) return s
      const next = Scene.fromJSON(s.toJSON())
      const newVisual = new Visual()
      newVisualId = newVisual.id
      newVisual.dialogs = [newDialog, ...extras]

      next.visuals = next.visuals.map(v => {
        if (v.id !== visualId) return v
        const after = v.dialogs.find(d => d.id === afterDialogId)
        if (after) wireLeafToNext(after, newDialog.id)
        return v
      })
      next.visuals = [...next.visuals, newVisual]
      return next
    })
    return { scenes: updated, newVisualId }
  }

  let newSceneId = ''
  let newVisualId = ''
  const updated = scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      const after = v.dialogs.find(d => d.id === afterDialogId)
      if (after) wireLeafToNext(after, newDialog.id)
      return v
    })
    return next
  })

  const newScene = createBlankScene()
  newSceneId = newScene.id
  newVisualId = newScene.visuals[0].id
  newScene.visuals[0].dialogs = [newDialog, ...extras]

  return {
    scenes: [...updated, newScene],
    newSceneId,
    newVisualId,
  }
}

/** Insert a new dialog in series immediately after `afterDialogId`. */
export function insertDialogAfter(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  afterDialogId: string,
  kind: DialogKind,
  explicitTargetId?: string | null,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      const { dialog: newDialog, extras } = createDialogBundle(kind)
      const after = v.dialogs.find(d => d.id === afterDialogId)

      if (!after) {
        v.dialogs = [...v.dialogs, newDialog, ...extras]
        return v
      }

      if (after.kind === 'line') {
        const ld = after as LineDialog
        const targetId = explicitTargetId !== undefined ? explicitTargetId : ld.nextId
        ld.nextId = newDialog.id
        if (newDialog.kind === 'line') {
          ;(newDialog as LineDialog).nextId = targetId
        } else if (newDialog.kind === 'choice') {
          const cd = newDialog as ChoiceDialog
          if (targetId && cd.options[0]) cd.options[0].nextId = targetId
        } else if (newDialog.kind === 'conditional') {
          const cond = newDialog as ConditionalDialog
          if (targetId) cond.trueNextId = targetId
        }
      } else if (after.kind === 'choice') {
        const cd = after as ChoiceDialog
        const openOptions = cd.options.filter(o => !o.nextId)
        if (openOptions.length) {
          for (const opt of cd.options) {
            if (!opt.nextId) opt.nextId = newDialog.id
          }
        } else {
          // All branches wired — splice after first option's target chain entry
          const firstTarget = cd.options[0]?.nextId
          if (firstTarget && newDialog.kind === 'line') {
            ;(newDialog as LineDialog).nextId = firstTarget
          }
          if (cd.options[0]) cd.options[0].nextId = newDialog.id
        }
      } else if (after.kind === 'conditional') {
        const cond = after as ConditionalDialog
        if (!cond.trueNextId) {
          cond.trueNextId = newDialog.id
        } else if (!cond.falseNextId) {
          cond.falseNextId = newDialog.id
        } else {
          const targetId = explicitTargetId !== undefined ? explicitTargetId : cond.trueNextId
          cond.trueNextId = newDialog.id
          if (newDialog.kind === 'line') {
            ;(newDialog as LineDialog).nextId = targetId
          }
        }
      }

      v.dialogs = [...v.dialogs, newDialog, ...extras]
      return v
    })
    return next
  })
}

export function updateDialog(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  dialogId: string,
  patch: Partial<LineDialog> | Partial<ChoiceDialog> | Partial<ConditionalDialog>,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      v.dialogs = v.dialogs.map(d => {
        if (d.id !== dialogId) return d
        Object.assign(d, patch)
        return d
      })
      return v
    })
    return next
  })
}

export function switchDialogKind(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  dialogId: string,
  newKind: DialogKind,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      const oldIdx = v.dialogs.findIndex(d => d.id === dialogId)
      if (oldIdx < 0) return v
      const old = v.dialogs[oldIdx]

      let firstOutgoing: string | null = null
      let secondOutgoing: string | null = null

      if (old.kind === 'line') {
        firstOutgoing = (old as LineDialog).nextId
      } else if (old.kind === 'choice') {
        firstOutgoing = (old as ChoiceDialog).options[0]?.nextId ?? null
        secondOutgoing = (old as ChoiceDialog).options[1]?.nextId ?? null
      } else if (old.kind === 'conditional') {
        firstOutgoing = (old as ConditionalDialog).trueNextId
        secondOutgoing = (old as ConditionalDialog).falseNextId
      }

      let newDialog: Dialog
      const extraDialogs: Dialog[] = []

      if (newKind === 'line') {
        const d = new LineDialog(dialogId)
        d.tagIds = old.tagIds
        if (old.kind === 'line') {
          d.speakerId = (old as LineDialog).speakerId
          d.text = (old as LineDialog).text
        } else if (old.kind === 'choice') {
          d.text = (old as ChoiceDialog).text
        }
        d.nextId = firstOutgoing
        newDialog = d
      } else if (newKind === 'choice') {
        const d = new ChoiceDialog(dialogId)
        d.tagIds = old.tagIds
        if (old.kind === 'line') d.text = (old as LineDialog).text
        else if (old.kind === 'choice') d.text = (old as ChoiceDialog).text
        let opt1NextId = firstOutgoing
        if (!opt1NextId) {
          const blankA = createBlankLineDialog()
          extraDialogs.push(blankA)
          opt1NextId = blankA.id
        }
        let opt2NextId = secondOutgoing
        if (!opt2NextId) {
          const blankB = createBlankLineDialog()
          extraDialogs.push(blankB)
          opt2NextId = blankB.id
        }
        d.options = [
          { id: nanoid(), label: 'Option A', effects: [], nextId: opt1NextId },
          { id: nanoid(), label: 'Option B', effects: [], nextId: opt2NextId },
        ]
        newDialog = d
      } else {
        const d = new ConditionalDialog(dialogId)
        d.tagIds = old.tagIds
        d.trueNextId = firstOutgoing
        let falseNext = secondOutgoing
        if (!falseNext) {
          const blank = createBlankLineDialog()
          extraDialogs.push(blank)
          falseNext = blank.id
        }
        d.falseNextId = falseNext
        newDialog = d
      }

      const dialogs = [...v.dialogs]
      dialogs[oldIdx] = newDialog
      dialogs.push(...extraDialogs)
      v.dialogs = dialogs
      return v
    })
    return next
  })
}

export function deleteDialog(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  dialogId: string,
): Scene[] | null {
  let blocked = false

  const result = scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v

      const incoming = getIncomingCount(dialogId, v)
      if (incoming > 1) {
        blocked = true
        return v
      }

      if (v.dialogs.length <= 1) {
        v.dialogs = [createBlankLineDialog()]
        return v
      }

      const target = v.dialogs.find(d => d.id === dialogId)
      let outgoingId: string | null = null
      if (target?.kind === 'line') {
        outgoingId = (target as LineDialog).nextId
      } else if (target?.kind === 'choice') {
        outgoingId = (target as ChoiceDialog).options[0]?.nextId ?? null
      } else if (target?.kind === 'conditional') {
        outgoingId = (target as ConditionalDialog).trueNextId
      }

      v.dialogs = v.dialogs
        .filter(d => d.id !== dialogId)
        .map(d => {
          if (d.kind === 'line' && (d as LineDialog).nextId === dialogId) {
            ;(d as LineDialog).nextId = outgoingId
          } else if (d.kind === 'choice') {
            ;(d as ChoiceDialog).options = (d as ChoiceDialog).options.map(o => ({
              ...o,
              nextId: o.nextId === dialogId ? outgoingId : o.nextId,
            }))
          } else if (d.kind === 'conditional') {
            const cd = d as ConditionalDialog
            if (cd.trueNextId === dialogId) cd.trueNextId = outgoingId
            if (cd.falseNextId === dialogId) cd.falseNextId = outgoingId
          }
          return d
        })
      return v
    })
    return next
  })

  return blocked ? null : result
}

export function removeChoiceOption(
  scenes: Scene[],
  sceneId: string,
  visualId: string,
  dialogId: string,
  optionId: string,
): Scene[] {
  return scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v

      const choice = v.dialogs.find(d => d.id === dialogId)
      if (!choice || choice.kind !== 'choice') return v

      const cd = choice as ChoiceDialog
      if (!cd.options.some(o => o.id === optionId)) return v
      cd.options = cd.options.filter(o => o.id !== optionId)
      return v
    })
    return next
  })
}

export function linkDialogs(
  project: Project,
  sceneId: string,
  visualId: string,
  sourceId: string,
  targetId: string,
  slot: 'nextId' | 'trueNextId' | 'falseNextId' | { optionId: string },
): Project {
  const scenes = project.scenes.map(s => {
    if (s.id !== sceneId) return s
    const next = Scene.fromJSON(s.toJSON())
    next.visuals = next.visuals.map(v => {
      if (v.id !== visualId) return v
      v.dialogs = v.dialogs.map(d => {
        if (d.id !== sourceId) return d
        if (typeof slot === 'string') {
          if (slot === 'nextId' && d.kind === 'line') {
            ;(d as LineDialog).nextId = targetId
          } else if (slot === 'trueNextId' && d.kind === 'conditional') {
            ;(d as ConditionalDialog).trueNextId = targetId
          } else if (slot === 'falseNextId' && d.kind === 'conditional') {
            ;(d as ConditionalDialog).falseNextId = targetId
          }
        } else if (d.kind === 'choice') {
          ;(d as ChoiceDialog).options = (d as ChoiceDialog).options.map(o =>
            o.id === slot.optionId ? { ...o, nextId: targetId } : o,
          )
        }
        return d
      })
      return v
    })
    return next
  })
  return { ...project, scenes }
}

