import { createHash } from 'node:crypto'

/**
 * Private Bunny storage for AudioClip files (ADR-0018).
 *
 * A separate storage zone from the public photos, behind its own pull zone
 * with Token Authentication on: a plain link to a file is refused, and the
 * only working link is one this module signs, which expires. Nothing here is
 * public, and no file address is ever stored or sent without a signature.
 *
 * All five variables are optional so a deploy without them still boots; the
 * audio routes answer 503 until they are set.
 */

type AudioStorageConfig = {
  zoneName: string
  hostname: string
  apiKey: string
  pullZoneHost: string
  tokenKey: string
}

export function audioStorageConfig(env: NodeJS.ProcessEnv = process.env): AudioStorageConfig | null {
  const zoneName = env.BUNNY_AUDIO_STORAGE_ZONE_NAME?.trim()
  const hostname = env.BUNNY_AUDIO_STORAGE_HOSTNAME?.trim()
  const apiKey = env.BUNNY_AUDIO_STORAGE_API_KEY?.trim()
  const pullZoneHost = env.BUNNY_AUDIO_PULL_ZONE_HOST?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const tokenKey = env.BUNNY_AUDIO_TOKEN_KEY?.trim()
  if (!zoneName || !hostname || !apiKey || !pullZoneHost || !tokenKey) return null
  return { zoneName, hostname, apiKey, pullZoneHost, tokenKey }
}

export class AudioStorageUnavailable extends Error {
  constructor() {
    super('Audio storage is not configured (BUNNY_AUDIO_* variables).')
  }
}

function requireConfig(): AudioStorageConfig {
  const config = audioStorageConfig()
  if (!config) throw new AudioStorageUnavailable()
  return config
}

/** Live and local never share files: a local test can not replace a live clip. */
function environmentPrefix(): string {
  return process.env.NODE_ENV === 'production' ? 'live' : 'local'
}

/** `live/articles/54/plan-the-trip-1763590000000.mp3`. A new name per recording, so a CDN copy of the old one can never be served for the new one. */
export function audioStorageKey(articleId: number, sectionKey: string, now = Date.now()): string {
  const safeSection = sectionKey.replace(/[^a-z0-9-]/g, '-').slice(0, 90) || 'section'
  return `${environmentPrefix()}/articles/${articleId}/${safeSection}-${now}.mp3`
}

function storageUrl(config: AudioStorageConfig, key: string): string {
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `https://${config.hostname}/${encodeURIComponent(config.zoneName)}/${path}`
}

export async function uploadAudioFile(key: string, body: Uint8Array): Promise<void> {
  const config = requireConfig()
  const response = await fetch(storageUrl(config, key), {
    method: 'PUT',
    headers: { AccessKey: config.apiKey, 'Content-Type': 'audio/mpeg' },
    body: Buffer.from(body),
  })
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Audio upload failed (HTTP ${response.status}).`)
  }
}

/** Deleting a file that is already gone is success. */
export async function deleteAudioFile(key: string): Promise<void> {
  const config = requireConfig()
  const response = await fetch(storageUrl(config, key), {
    method: 'DELETE',
    headers: { AccessKey: config.apiKey },
  })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Audio delete failed (HTTP ${response.status}).`)
  }
}

/**
 * Bunny's basic URL token: Base64URL(SHA256(tokenKey + path + expires)),
 * sent as `?token=…&expires=…`. The path is the URL path as the CDN sees it.
 */
export function signAudioUrl(key: string, ttlSeconds = 15 * 60, nowSeconds = Math.floor(Date.now() / 1000)): {
  url: string
  expiresAt: number
} {
  const config = requireConfig()
  const path = '/' + key.split('/').map(encodeURIComponent).join('/')
  const expires = nowSeconds + ttlSeconds
  const token = createHash('sha256')
    .update(config.tokenKey + path + String(expires))
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return { url: `https://${config.pullZoneHost}${path}?token=${token}&expires=${expires}`, expiresAt: expires }
}
