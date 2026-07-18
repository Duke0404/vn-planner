import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Project, projectFromJSON, projectToJSON } from '../model/project'
import {
  Scene,
  createBlankScene,
  type DialogKind,
  LineDialog,
  ChoiceDialog,
  ConditionalDialog,
  type ChoiceOption,
} from '../model/nodes'
import { type Variable, createVariable } from '../model/variables'
import { createTag, type Tag } from '../model/tags'
import { createSpeaker, type Speaker } from '../model/speakers'
import { nanoid } from '../lib/nanoid'
import {
  addScene,
  removeScene,
  updateScene,
  addVisualToScene,
  removeVisualFromScene,
  updateVisual,
  addDialogParallel,
  addDialogSeries,
  insertDialogSeriesAfter,
  updateDialog,
  switchDialogKind,
  deleteDialog,
  linkDialogs,
  removeChoiceOption,
  type SeriesInsertTarget,
} from '../lib/nestedMutations'
import {
  collectReferencedVariableIds,
  removeVariable,
  updateVariable,
  addSubVariable,
} from '../lib/variableTree'
import { removeTag, updateTag, addSubTag } from '../lib/tagTree'
import {
  addSubSpeaker,
  collectReferencedSpeakerIds,
  removeSpeaker,
  updateSpeaker,
} from '../lib/speakerTree'
import { sanitizeUiState } from './selectors'
import {
  decryptExportPayload,
  encryptExportPayload,
  ENCRYPTED_EXPORT_FORMAT,
  getExportSecret,
  isEncryptedExportFile,
} from '../lib/exportCrypto'

export type Selection =
  | { type: 'scene'; sceneId: string }
  | { type: 'visual'; sceneId: string; visualId: string }
  | { type: 'dialog'; sceneId: string; visualId: string; dialogId: string }

export type LinkPickMode = {
  sourceId: string
  slot: 'nextId' | 'trueNextId' | 'falseNextId' | { optionId: string }
  visualId: string
  sceneId: string
}

export type ContextMenuTarget =
  | { kind: 'scene'; sceneId: string; x: number; y: number }
  | { kind: 'visual'; sceneId: string; visualId: string; x: number; y: number }
  | { kind: 'dialog'; sceneId: string; visualId: string; dialogId: string; x: number; y: number }

interface PlannerState {
  project: Project
  selection: Selection | null
  expandedSceneIds: string[]
  expandedVisualIds: string[]
  history: string[]
  linkPickMode: LinkPickMode | null
  contextMenu: ContextMenuTarget | null
  configOpen: boolean
  encryptExportImport: boolean
}

const MAX_HISTORY = 20

function makeBlankProject(): Project {
  const scene = createBlankScene()
  return { variables: [], tags: [], speakers: [], scenes: [scene] }
}

function snapshot(p: Project): string {
  return JSON.stringify(projectToJSON(p))
}

function restore(s: string): Project {
  return projectFromJSON(JSON.parse(s))
}

function expandForSelection(
  expandedSceneIds: string[],
  expandedVisualIds: string[],
  selection: Selection,
): { expandedSceneIds: string[]; expandedVisualIds: string[] } {
  const nextSceneIds = expandedSceneIds.includes(selection.sceneId)
    ? expandedSceneIds
    : [...expandedSceneIds, selection.sceneId]

  if (selection.type === 'scene') {
    return { expandedSceneIds: nextSceneIds, expandedVisualIds }
  }

  const nextVisualIds = expandedVisualIds.includes(selection.visualId)
    ? expandedVisualIds
    : [...expandedVisualIds, selection.visualId]

  return { expandedSceneIds: nextSceneIds, expandedVisualIds: nextVisualIds }
}

interface PlannerActions {
  undo: () => void
  pushHistory: () => void

  select: (sel: Selection | null) => void

  openContextMenu: (target: ContextMenuTarget) => void
  closeContextMenu: () => void

  toggleExpandScene: (sceneId: string) => void
  toggleExpandVisual: (sceneId: string, visualId: string) => void

  addScene: () => void
  deleteScene: (sceneId: string) => void
  updateSceneName: (sceneId: string, name: string) => void
  updateSceneTags: (sceneId: string, tagIds: string[]) => void

  addVisual: (sceneId: string) => void
  deleteVisual: (sceneId: string, visualId: string) => void
  updateVisualName: (sceneId: string, visualId: string, name: string) => void
  updateVisualTags: (sceneId: string, visualId: string, tagIds: string[]) => void

  addDialogParallel: (sceneId: string, visualId: string, kind: DialogKind) => void
  insertDialogAfter: (
    sceneId: string,
    visualId: string,
    afterDialogId: string,
    kind: DialogKind,
    target?: SeriesInsertTarget,
  ) => void
  addDialogSeries: (
    sceneId: string,
    visualId: string,
    sourceId: string,
    targetId: string,
    kind: DialogKind,
  ) => void
  deleteDialog: (sceneId: string, visualId: string, dialogId: string) => string | null
  updateDialogField: (
    sceneId: string,
    visualId: string,
    dialogId: string,
    patch: Partial<LineDialog> | Partial<ChoiceDialog> | Partial<ConditionalDialog>,
  ) => void
  switchKind: (sceneId: string, visualId: string, dialogId: string, kind: DialogKind) => void

  startLinkPick: (mode: LinkPickMode) => void
  cancelLinkPick: () => void
  applyLinkPick: (targetDialogId: string) => void

  addChoiceOption: (sceneId: string, visualId: string, dialogId: string) => void
  updateChoiceOption: (
    sceneId: string,
    visualId: string,
    dialogId: string,
    option: ChoiceOption,
  ) => void
  removeChoiceOption: (
    sceneId: string,
    visualId: string,
    dialogId: string,
    optionId: string,
  ) => void

  addRootVariable: () => void
  addSubVariable: (parentId: string) => void
  updateVariable: (id: string, patch: Partial<Variable>) => void
  deleteVariable: (id: string) => string | void

  addRootTag: () => void
  addSubTag: (parentId: string) => void
  updateTag: (id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) => void
  deleteTag: (id: string) => void

  addRootSpeaker: () => void
  addSubSpeaker: (parentId: string) => void
  updateSpeaker: (id: string, patch: Partial<Pick<Speaker, 'name' | 'color'>>) => void
  deleteSpeaker: (id: string) => string | void

  setConfigOpen: (open: boolean) => void

  setEncryptExportImport: (enabled: boolean) => void
  exportProject: () => Promise<void>
  importProject: (text: string) => Promise<void>
}

export const usePlannerStore = create<PlannerState & PlannerActions>()(
  persist(
    (set, get) => ({
      project: makeBlankProject(),
      selection: null,
      expandedSceneIds: [],
      expandedVisualIds: [],
      history: [],
      linkPickMode: null,
      contextMenu: null,
      configOpen: false,
      encryptExportImport: true,

      pushHistory() {
        const { project, history } = get()
        const snap = snapshot(project)
        const next = [snap, ...history].slice(0, MAX_HISTORY)
        set({ history: next })
      },

      undo() {
        const { history } = get()
        if (!history.length) return
        const [last, ...rest] = history
        set({ project: restore(last), history: rest, selection: null })
      },

      select(sel) {
        if (!sel) {
          set({ selection: null, linkPickMode: null, contextMenu: null })
          return
        }
        const { expandedSceneIds, expandedVisualIds } = get()
        const expanded = expandForSelection(expandedSceneIds, expandedVisualIds, sel)
        set({
          selection: sel,
          ...expanded,
          linkPickMode: null,
          contextMenu: null,
        })
      },

      openContextMenu(target) {
        let selection: Selection | null = null
        if (target.kind === 'scene') {
          selection = { type: 'scene', sceneId: target.sceneId }
        } else if (target.kind === 'visual') {
          selection = { type: 'visual', sceneId: target.sceneId, visualId: target.visualId }
        } else {
          selection = {
            type: 'dialog',
            sceneId: target.sceneId,
            visualId: target.visualId,
            dialogId: target.dialogId,
          }
        }
        const { expandedSceneIds, expandedVisualIds } = get()
        const expanded = expandForSelection(expandedSceneIds, expandedVisualIds, selection)
        set({ contextMenu: target, linkPickMode: null, selection, ...expanded })
      },

      closeContextMenu() {
        set({ contextMenu: null })
      },

      toggleExpandScene(sceneId) {
        const { expandedSceneIds, expandedVisualIds, selection, project } = get()
        const sceneExpanded = expandedSceneIds.includes(sceneId)

        if (!sceneExpanded) {
          set({
            expandedSceneIds: [...expandedSceneIds, sceneId],
            selection: { type: 'scene', sceneId },
            linkPickMode: null,
          })
          return
        }

        const scene = project.scenes.find(s => s.id === sceneId)
        const expandedVisualsInScene =
          scene?.visuals.filter(v => expandedVisualIds.includes(v.id)).map(v => v.id) ?? []

        if (expandedVisualsInScene.length > 0) {
          set({
            expandedVisualIds: expandedVisualIds.filter(
              id => !expandedVisualsInScene.includes(id),
            ),
            selection:
              selection?.sceneId === sceneId ? { type: 'scene', sceneId } : selection,
            linkPickMode: null,
          })
          return
        }

        set({
          expandedSceneIds: expandedSceneIds.filter(id => id !== sceneId),
          selection: selection?.sceneId === sceneId ? null : selection,
          linkPickMode: null,
        })
      },

      toggleExpandVisual(sceneId, visualId) {
        const { expandedSceneIds, expandedVisualIds, selection } = get()
        const visualExpanded = expandedVisualIds.includes(visualId)

        if (!visualExpanded) {
          const nextSceneIds = expandedSceneIds.includes(sceneId)
            ? expandedSceneIds
            : [...expandedSceneIds, sceneId]
          set({
            expandedSceneIds: nextSceneIds,
            expandedVisualIds: [...expandedVisualIds, visualId],
            selection: { type: 'visual', sceneId, visualId },
            linkPickMode: null,
          })
          return
        }

        if (
          selection?.type === 'dialog' &&
          selection.sceneId === sceneId &&
          selection.visualId === visualId
        ) {
          set({
            selection: { type: 'visual', sceneId, visualId },
            linkPickMode: null,
          })
          return
        }

        const shouldCollapseSelection =
          selection &&
          selection.type !== 'scene' &&
          selection.sceneId === sceneId &&
          selection.visualId === visualId

        set({
          expandedVisualIds: expandedVisualIds.filter(id => id !== visualId),
          selection: shouldCollapseSelection ? { type: 'scene', sceneId } : selection,
          linkPickMode: null,
        })
      },

      addScene() {
        get().pushHistory()
        const { project } = get()
        set({ project: { ...project, scenes: addScene(project.scenes) } })
      },

      deleteScene(sceneId) {
        get().pushHistory()
        const { project, selection, expandedSceneIds, expandedVisualIds } = get()
        const scenes = removeScene(project.scenes, sceneId)
        const removedVisualIds =
          project.scenes.find(s => s.id === sceneId)?.visuals.map(v => v.id) ?? []
        const nextProject = { ...project, scenes }
        const sanitized = sanitizeUiState(
          nextProject,
          expandedSceneIds.filter(id => id !== sceneId),
          expandedVisualIds.filter(id => !removedVisualIds.includes(id)),
          selection?.sceneId === sceneId ? null : selection,
        )
        set({ project: nextProject, ...sanitized })
      },

      updateSceneName(sceneId, name) {
        const { project } = get()
        const scenes = updateScene(project.scenes, sceneId, { name } as Partial<Scene>)
        set({ project: { ...project, scenes } })
      },

      updateSceneTags(sceneId, tagIds) {
        const { project } = get()
        const scenes = updateScene(project.scenes, sceneId, { tagIds } as Partial<Scene>)
        set({ project: { ...project, scenes } })
      },

      addVisual(sceneId) {
        get().pushHistory()
        const { project } = get()
        const scenes = addVisualToScene(project.scenes, sceneId)
        set({ project: { ...project, scenes } })
      },

      deleteVisual(sceneId, visualId) {
        get().pushHistory()
        const { project, selection, expandedSceneIds, expandedVisualIds } = get()
        const scenes = removeVisualFromScene(project.scenes, sceneId, visualId)
        const nextProject = { ...project, scenes }
        const nextSelection: Selection | null =
          (selection?.type === 'visual' && selection.visualId === visualId) ||
          (selection?.type === 'dialog' && selection.visualId === visualId)
            ? { type: 'scene', sceneId }
            : selection
        const sanitized = sanitizeUiState(
          nextProject,
          expandedSceneIds,
          expandedVisualIds.filter(id => id !== visualId),
          nextSelection,
        )
        set({ project: nextProject, ...sanitized })
      },

      updateVisualName(sceneId, visualId, name) {
        const { project } = get()
        const scenes = updateVisual(project.scenes, sceneId, visualId, {
          name,
        } as Partial<import('../model/nodes').Visual>)
        set({ project: { ...project, scenes } })
      },

      updateVisualTags(sceneId, visualId, tagIds) {
        const { project } = get()
        const scenes = updateVisual(project.scenes, sceneId, visualId, {
          tagIds,
        } as Partial<import('../model/nodes').Visual>)
        set({ project: { ...project, scenes } })
      },

      addDialogParallel(sceneId, visualId, kind) {
        get().pushHistory()
        const { project } = get()
        const scenes = addDialogParallel(project.scenes, sceneId, visualId, kind)
        set({ project: { ...project, scenes } })
      },

      addDialogSeries(sceneId, visualId, sourceId, targetId, kind) {
        get().pushHistory()
        const { project } = get()
        const scenes = addDialogSeries(
          project.scenes,
          sceneId,
          visualId,
          sourceId,
          targetId,
          kind,
        )
        set({ project: { ...project, scenes } })
      },

      insertDialogAfter(sceneId, visualId, afterDialogId, kind, target = 'same-visual') {
        get().pushHistory()
        const { project, expandedSceneIds, expandedVisualIds } = get()
        const result = insertDialogSeriesAfter(
          project.scenes,
          sceneId,
          visualId,
          afterDialogId,
          kind,
          target,
        )

        let nextSceneIds = expandedSceneIds.includes(sceneId)
          ? expandedSceneIds
          : [...expandedSceneIds, sceneId]
        let nextVisualIds = expandedVisualIds.includes(visualId)
          ? expandedVisualIds
          : [...expandedVisualIds, visualId]

        if (result.newVisualId && !nextVisualIds.includes(result.newVisualId)) {
          nextVisualIds = [...nextVisualIds, result.newVisualId]
        }
        if (result.newSceneId && !nextSceneIds.includes(result.newSceneId)) {
          nextSceneIds = [...nextSceneIds, result.newSceneId]
        }

        set({
          project: { ...project, scenes: result.scenes },
          expandedSceneIds: nextSceneIds,
          expandedVisualIds: nextVisualIds,
        })
      },

      deleteDialog(sceneId, visualId, dialogId) {
        const { project, selection } = get()
        const result = deleteDialog(project.scenes, sceneId, visualId, dialogId)
        if (!result) {
          return 'Reached from multiple paths; remove an incoming link first'
        }
        get().pushHistory()
        const nextSel: Selection | null =
          selection?.type === 'dialog' && selection.dialogId === dialogId
            ? { type: 'visual', sceneId, visualId }
            : selection
        set({ project: { ...project, scenes: result }, selection: nextSel })
        return null
      },

      updateDialogField(sceneId, visualId, dialogId, patch) {
        const { project } = get()
        const scenes = updateDialog(project.scenes, sceneId, visualId, dialogId, patch)
        set({ project: { ...project, scenes } })
      },

      switchKind(sceneId, visualId, dialogId, kind) {
        get().pushHistory()
        const { project } = get()
        const scenes = switchDialogKind(project.scenes, sceneId, visualId, dialogId, kind)
        set({ project: { ...project, scenes } })
      },

      startLinkPick(mode) {
        set({ linkPickMode: mode })
      },

      cancelLinkPick() {
        set({ linkPickMode: null })
      },

      applyLinkPick(targetDialogId) {
        const { linkPickMode, project } = get()
        if (!linkPickMode) return
        get().pushHistory()
        const updatedProject = linkDialogs(
          project,
          linkPickMode.sceneId,
          linkPickMode.visualId,
          linkPickMode.sourceId,
          targetDialogId,
          linkPickMode.slot,
        )
        set({ project: updatedProject, linkPickMode: null })
      },

      addChoiceOption(sceneId, visualId, dialogId) {
        const { project } = get()
        const scene = project.scenes.find(s => s.id === sceneId)
        const visual = scene?.visuals.find(v => v.id === visualId)
        const dialog = visual?.dialogs.find(d => d.id === dialogId)
        if (!dialog || dialog.kind !== 'choice') return

        const blank = new LineDialog()
        const newOpt: ChoiceOption = { id: nanoid(), label: 'Option', effects: [], nextId: blank.id }
        const newOptions = [...(dialog as ChoiceDialog).options, newOpt]

        const addBlankScenes = project.scenes.map(s => {
          if (s.id !== sceneId) return s
          const next = Scene.fromJSON(s.toJSON())
          next.visuals = next.visuals.map(v => {
            if (v.id !== visualId) return v
            v.dialogs = [...v.dialogs, blank]
            return v
          })
          return next
        })

        const scenes = updateDialog(addBlankScenes, sceneId, visualId, dialogId, {
          options: newOptions,
        } as Partial<ChoiceDialog>)
        set({ project: { ...project, scenes } })
      },

      updateChoiceOption(sceneId, visualId, dialogId, option) {
        const { project } = get()
        const scene = project.scenes.find(s => s.id === sceneId)
        const visual = scene?.visuals.find(v => v.id === visualId)
        const dialog = visual?.dialogs.find(d => d.id === dialogId)
        if (!dialog || dialog.kind !== 'choice') return
        const options = (dialog as ChoiceDialog).options.map(o =>
          o.id === option.id ? option : o,
        )
        const scenes = updateDialog(project.scenes, sceneId, visualId, dialogId, {
          options,
        } as Partial<ChoiceDialog>)
        set({ project: { ...project, scenes } })
      },

      removeChoiceOption(sceneId, visualId, dialogId, optionId) {
        get().pushHistory()
        const { project } = get()
        const scenes = removeChoiceOption(
          project.scenes,
          sceneId,
          visualId,
          dialogId,
          optionId,
        )
        set({ project: { ...project, scenes } })
      },

      addRootVariable() {
        const { project } = get()
        const v = createVariable()
        set({ project: { ...project, variables: [...project.variables, v] } })
      },

      addSubVariable(parentId) {
        const { project } = get()
        const child = createVariable()
        set({
          project: {
            ...project,
            variables: addSubVariable(project.variables, parentId, child),
          },
        })
      },

      updateVariable(id, patch) {
        const { project } = get()
        set({
          project: {
            ...project,
            variables: updateVariable(project.variables, id, patch),
          },
        })
      },

      deleteVariable(id) {
        const { project } = get()
        const referenced = collectReferencedVariableIds(project.scenes)
        if (referenced.has(id)) {
          return 'Variable is referenced by an effect or condition and cannot be deleted.'
        }
        set({
          project: {
            ...project,
            variables: removeVariable(project.variables, id),
          },
        })
      },

      addRootTag() {
        const { project } = get()
        const t = createTag()
        set({ project: { ...project, tags: [...project.tags, t] } })
      },

      addSubTag(parentId) {
        const { project } = get()
        const child = createTag()
        set({
          project: {
            ...project,
            tags: addSubTag(project.tags, parentId, child),
          },
        })
      },

      updateTag(id, patch) {
        const { project } = get()
        set({
          project: {
            ...project,
            tags: updateTag(project.tags, id, patch),
          },
        })
      },

      deleteTag(id) {
        const { project } = get()
        set({
          project: {
            ...project,
            tags: removeTag(project.tags, id),
          },
        })
      },

      addRootSpeaker() {
        const { project } = get()
        const speaker = createSpeaker()
        set({ project: { ...project, speakers: [...project.speakers, speaker] } })
      },

      addSubSpeaker(parentId) {
        const { project } = get()
        const child = createSpeaker()
        set({
          project: {
            ...project,
            speakers: addSubSpeaker(project.speakers, parentId, child),
          },
        })
      },

      updateSpeaker(id, patch) {
        const { project } = get()
        set({
          project: {
            ...project,
            speakers: updateSpeaker(project.speakers, id, patch),
          },
        })
      },

      deleteSpeaker(id) {
        const { project } = get()
        const referenced = collectReferencedSpeakerIds(project.scenes)
        if (referenced.has(id)) {
          return 'Speaker is used by a dialog and cannot be deleted.'
        }
        set({
          project: {
            ...project,
            speakers: removeSpeaker(project.speakers, id),
          },
        })
      },

      setConfigOpen(open) {
        set({ configOpen: open })
      },

      setEncryptExportImport(enabled) {
        set({ encryptExportImport: enabled })
      },

      async exportProject() {
        const { project, encryptExportImport } = get()
        const json = JSON.stringify(projectToJSON(project), null, 2)

        let fileBody: string
        let fileName = 'vn-project.json'

        if (encryptExportImport) {
          const secret = getExportSecret()
          if (!secret) {
            alert('EXPORT_SECRET is not set. Add it to your .env file to export encrypted projects.')
            return
          }
          const payload = await encryptExportPayload(json, secret)
          fileBody = JSON.stringify({ format: ENCRYPTED_EXPORT_FORMAT, payload }, null, 2)
          fileName = 'vn-project.enc.json'
        } else {
          fileBody = json
        }

        const blob = new Blob([fileBody], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
      },

      async importProject(text) {
        try {
          const parsed: unknown = JSON.parse(text)
          const { encryptExportImport } = get()
          let projectJson: string

          if (isEncryptedExportFile(parsed)) {
            if (!encryptExportImport) {
              alert('This file is encrypted. Enable "Encrypt export/import" to import it.')
              return
            }
            const secret = getExportSecret()
            if (!secret) {
              alert('This file is encrypted. Set EXPORT_SECRET in your .env file to import it.')
              return
            }
            projectJson = await decryptExportPayload(parsed.payload, secret)
          } else if (encryptExportImport) {
            alert('Encrypted import is enabled, but this file is not encrypted.')
            return
          } else {
            projectJson = text
          }

          const raw = JSON.parse(projectJson) as Record<string, unknown>
          const project = projectFromJSON(raw)
          get().pushHistory()
          const sanitized = sanitizeUiState(project, [], [], null)
          set({ project, ...sanitized })
        } catch {
          alert('Invalid or unreadable project file.')
        }
      },
    }),
    {
      name: 'vn-planner-project',
      partialize: state => ({
        project: projectToJSON(state.project),
        selection: state.selection,
        expandedSceneIds: state.expandedSceneIds,
        expandedVisualIds: state.expandedVisualIds,
        encryptExportImport: state.encryptExportImport,
      }),
      merge: (persisted, current) => {
        try {
          const saved = persisted as {
            project: Record<string, unknown>
            selection?: Selection | null
            expandedSceneIds?: string[]
            expandedVisualIds?: string[]
            encryptExportImport?: boolean
          }
          const project = projectFromJSON(saved.project)
          const sanitized = sanitizeUiState(
            project,
            saved.expandedSceneIds ?? [],
            saved.expandedVisualIds ?? [],
            saved.selection ?? null,
          )
          return {
            ...current,
            project,
            ...sanitized,
            encryptExportImport: saved.encryptExportImport ?? true,
          }
        } catch {
          return current
        }
      },
    },
  ),
)
