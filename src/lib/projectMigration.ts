import type { Tag } from '../model/tags'
import type { Speaker } from '../model/speakers'
import type { Project } from '../model/project'
import { DEFAULT_SPEAKER_COLOR, DEFAULT_TAG_COLOR } from '../model/colors'
import { createSpeaker } from '../model/speakers'
import { LineDialog, Scene } from '../model/nodes'
import { flattenSpeakers } from './speakerTree'
import {
  isLegacySpeakerId,
  legacySpeakerName,
} from './legacySpeaker'

function migrateTags(tags: Tag[]): Tag[] {
  return tags.map(t => ({
    ...t,
    color: t.color ?? DEFAULT_TAG_COLOR,
    children: migrateTags(t.children ?? []),
  }))
}

function migrateSpeakers(speakers: Speaker[]): Speaker[] {
  return speakers.map(s => ({
    ...s,
    color: s.color ?? DEFAULT_SPEAKER_COLOR,
    children: migrateSpeakers(s.children ?? []),
  }))
}

function resolveLegacySpeakers(project: Project): Project {
  const speakers = [...project.speakers]
  const byName = new Map(flattenSpeakers(speakers).map(s => [s.name.toLowerCase(), s.id]))

  for (const scene of project.scenes) {
    for (const visual of scene.visuals) {
      for (const dialog of visual.dialogs) {
        if (dialog.kind !== 'line') continue
        const ld = dialog as LineDialog
        if (!ld.speakerId || !isLegacySpeakerId(ld.speakerId)) continue

        const name = legacySpeakerName(ld.speakerId)
        let speakerId = byName.get(name.toLowerCase())
        if (!speakerId) {
          const sp = createSpeaker(name)
          speakers.push(sp)
          byName.set(name.toLowerCase(), sp.id)
          speakerId = sp.id
        }
        ld.speakerId = speakerId
      }
    }
  }

  return { ...project, speakers }
}

export function normalizeProject(raw: Record<string, unknown>): Project {
  const project: Project = {
    variables: (raw.variables as Project['variables']) ?? [],
    tags: migrateTags((raw.tags as Tag[]) ?? []),
    speakers: migrateSpeakers((raw.speakers as Speaker[]) ?? []),
    scenes: ((raw.scenes as Record<string, unknown>[]) ?? []).map(Scene.fromJSON),
  }
  return resolveLegacySpeakers(project)
}
