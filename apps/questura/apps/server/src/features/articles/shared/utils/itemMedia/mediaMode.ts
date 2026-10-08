import type { ListicleMediaMode, MediaMode } from '../../types/item-media.types'

const isMediaMode = (value: unknown): value is MediaMode =>
  value === 'photos' || value === 'instagram' || value === 'both'

export const getMediaMode = (value: unknown): MediaMode | null => {
  if (!isMediaMode(value)) {
    return null
  }

  return value
}

/** Like `getMediaMode`, but also accepts the listicle-only "no media" choice. */
export const getListicleMediaMode = (value: unknown): ListicleMediaMode | null =>
  value === 'none' ? value : getMediaMode(value)

export const requiresPhotos = (mode: ListicleMediaMode | null | undefined): boolean =>
  mode === 'photos' || mode === 'both'

export const requiresInstagram = (mode: ListicleMediaMode | null | undefined): boolean =>
  mode === 'instagram' || mode === 'both'
