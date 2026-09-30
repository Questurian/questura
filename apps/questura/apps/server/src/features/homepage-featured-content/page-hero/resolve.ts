import type { PayloadInstance } from '@/types'
import { resolveMediaSetForPlacement } from '@/features/media/lib/resolve-public-image'
import { isNotFoundError } from '@/shared/lib/not-found-error'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function relationshipId(value: unknown): number | null {
  const raw = isRecord(value) ? value.id : value
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function mediaSetHasAuthoredAlt(mediaSet: Record<string, unknown>): boolean {
  if (text(mediaSet.alt_text)) return true
  const variants = isRecord(mediaSet.variants) ? mediaSet.variants : null
  const hero = variants && isRecord(variants.hero) ? variants.hero : null
  return Boolean(hero && text(hero.alt_text))
}

export async function resolvePageHeroFields(
  payload: PayloadInstance,
  block: Record<string, unknown>,
) {
  const mediaSetId = relationshipId(block.heroMediaSet)
  let heroImage = null
  let heroImageAltReady = false

  if (mediaSetId) {
    try {
      const mediaSet = (await payload.findByID({
        collection: 'media-sets',
        id: mediaSetId,
        depth: 1,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>
      heroImage = resolveMediaSetForPlacement(mediaSet, 'hero')
      heroImageAltReady = mediaSetHasAuthoredAlt(mediaSet)
    } catch (error) {
      // A deleted media set reads as no image and blocks publish; a failed read is not that.
      if (!isNotFoundError(error)) throw error
    }
  }

  return { heroMediaSetId: mediaSetId, heroImage, heroImageAltReady }
}
