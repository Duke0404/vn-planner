import type { Speaker } from '../model/speakers'
import type { Scene } from '../model/nodes'
import { LineDialog } from '../model/nodes'

export function flattenSpeakers(speakers: Speaker[]): Speaker[] {
  const result: Speaker[] = []
  function walk(ss: Speaker[]) {
    for (const s of ss) {
      result.push(s)
      walk(s.children)
    }
  }
  walk(speakers)
  return result
}

export function findSpeaker(speakers: Speaker[], id: string): Speaker | null {
  for (const s of speakers) {
    if (s.id === id) return s
    const found = findSpeaker(s.children, id)
    if (found) return found
  }
  return null
}

export function removeSpeaker(speakers: Speaker[], id: string): Speaker[] {
  return speakers
    .filter(s => s.id !== id)
    .map(s => ({ ...s, children: removeSpeaker(s.children, id) }))
}

export function updateSpeaker(
  speakers: Speaker[],
  id: string,
  patch: Partial<Speaker>,
): Speaker[] {
  return speakers.map(s => {
    if (s.id === id) return { ...s, ...patch }
    return { ...s, children: updateSpeaker(s.children, id, patch) }
  })
}

export function addSubSpeaker(speakers: Speaker[], parentId: string, child: Speaker): Speaker[] {
  return speakers.map(s => {
    if (s.id === parentId) return { ...s, children: [...s.children, child] }
    return { ...s, children: addSubSpeaker(s.children, parentId, child) }
  })
}

export function collectReferencedSpeakerIds(scenes: Scene[]): Set<string> {
  const ids = new Set<string>()
  for (const scene of scenes) {
    for (const visual of scene.visuals) {
      for (const dialog of visual.dialogs) {
        if (dialog.kind === 'line') {
          const speakerId = (dialog as LineDialog).speakerId
          if (speakerId) ids.add(speakerId)
        }
      }
    }
  }
  return ids
}
