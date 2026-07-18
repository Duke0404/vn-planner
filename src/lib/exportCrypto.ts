export const ENCRYPTED_EXPORT_FORMAT = 'vn-planner-encrypted-v1' as const

export interface EncryptedExportFile {
  format: typeof ENCRYPTED_EXPORT_FORMAT
  payload: string
}

export function isEncryptedExportFile(raw: unknown): raw is EncryptedExportFile {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as EncryptedExportFile).format === ENCRYPTED_EXPORT_FORMAT &&
    typeof (raw as EncryptedExportFile).payload === 'string'
  )
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptExportPayload(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bytesToBase64(combined)
}

export async function decryptExportPayload(payload: string, secret: string): Promise<string> {
  const combined = base64ToBytes(payload)
  if (combined.length < 13) {
    throw new Error('Invalid encrypted export payload.')
  }
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const key = await deriveKey(secret)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

export function getExportSecret(): string {
  return import.meta.env.EXPORT_SECRET ?? ''
}
