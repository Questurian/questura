import { PHOTO_PILE_MIN_PHOTOS } from './block'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isReadyPhoto(value: unknown): boolean {
  return isRecord(value) && value.status === 'ready' && typeof value.url === 'string' && value.url.trim() !== ''
}

export function getPhotoPilePublishBlockers(
  block: Record<string, unknown>,
  blockIndex: number,
): string[] {
  const prefix = `Block ${blockIndex + 1}`
  const photos = Array.isArray(block.pilePhotos) ? block.pilePhotos : []
  const blockers = photos.flatMap((photo, index) =>
    isReadyPhoto(photo) ? [] : [`${prefix} photo ${index + 1} is missing a ready wide crop.`],
  )
  if (photos.length < PHOTO_PILE_MIN_PHOTOS) {
    blockers.push(`${prefix} needs at least ${PHOTO_PILE_MIN_PHOTOS} photos (has ${photos.length}).`)
  }
  return blockers
}
