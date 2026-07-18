import { nanoid } from '../lib/nanoid'
import { DEFAULT_SPEAKER_COLOR } from './colors'

export interface Speaker {
  id: string
  name: string
  color: string
  children: Speaker[]
}

export function createSpeaker(name = 'speaker', color = DEFAULT_SPEAKER_COLOR): Speaker {
  return { id: nanoid(), name, color, children: [] }
}
