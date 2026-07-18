import type { Project } from '../model/project'
import type { Selection } from './usePlannerStore'

export function isSceneExpanded(sceneId: string, expandedSceneIds: string[]): boolean {
  return expandedSceneIds.includes(sceneId)
}

export function isVisualExpanded(visualId: string, expandedVisualIds: string[]): boolean {
  return expandedVisualIds.includes(visualId)
}

export function sanitizeUiState(
  project: Project,
  expandedSceneIds: string[],
  expandedVisualIds: string[],
  selection: Selection | null,
): {
  expandedSceneIds: string[]
  expandedVisualIds: string[]
  selection: Selection | null
} {
  const sceneIds = new Set(project.scenes.map(s => s.id))
  const visualIds = new Set(project.scenes.flatMap(s => s.visuals.map(v => v.id)))

  const nextExpandedSceneIds = expandedSceneIds.filter(id => sceneIds.has(id))
  const nextExpandedVisualIds = expandedVisualIds.filter(id => visualIds.has(id))

  if (!selection) {
    return {
      expandedSceneIds: nextExpandedSceneIds,
      expandedVisualIds: nextExpandedVisualIds,
      selection: null,
    }
  }

  if (!sceneIds.has(selection.sceneId)) {
    return {
      expandedSceneIds: nextExpandedSceneIds,
      expandedVisualIds: nextExpandedVisualIds,
      selection: null,
    }
  }

  if (selection.type === 'scene') {
    return {
      expandedSceneIds: nextExpandedSceneIds,
      expandedVisualIds: nextExpandedVisualIds,
      selection,
    }
  }

  if (!visualIds.has(selection.visualId)) {
    return {
      expandedSceneIds: nextExpandedSceneIds,
      expandedVisualIds: nextExpandedVisualIds,
      selection: { type: 'scene', sceneId: selection.sceneId },
    }
  }

  if (selection.type === 'visual') {
    return {
      expandedSceneIds: nextExpandedSceneIds,
      expandedVisualIds: nextExpandedVisualIds,
      selection,
    }
  }

  const scene = project.scenes.find(s => s.id === selection.sceneId)
  const visual = scene?.visuals.find(v => v.id === selection.visualId)
  const dialogExists = visual?.dialogs.some(d => d.id === selection.dialogId) ?? false

  return {
    expandedSceneIds: nextExpandedSceneIds,
    expandedVisualIds: nextExpandedVisualIds,
    selection: dialogExists
      ? selection
      : { type: 'visual', sceneId: selection.sceneId, visualId: selection.visualId },
  }
}
