const LEGACY_SPEAKER_PREFIX = '__legacy_speaker__:'

export function legacySpeakerId(name: string): string {
  return LEGACY_SPEAKER_PREFIX + name
}

export function isLegacySpeakerId(id: string): boolean {
  return id.startsWith(LEGACY_SPEAKER_PREFIX)
}

export function legacySpeakerName(id: string): string {
  return id.slice(LEGACY_SPEAKER_PREFIX.length)
}
