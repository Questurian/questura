import { PublicImage } from '@/components/media/PublicImage'
import type { JoinPhoto } from '../data/photos'

/**
 * A /join photo: the site's fading image (photos appear whole), with the
 * file's own width and height, its crop, and the zoom that hides a cover's
 * drawn border.
 *
 * `sizes` is the frame's width. The browser picks a file by width only, so a
 * wide photo cropped into a square frame, or a zoomed cover, would come out
 * soft: `frame` (the frame's width over its height, at its narrowest) and the
 * zoom scale `sizes` up to the width of photo actually drawn.
 */
export function JoinImage({
  photo,
  sizes,
  frame,
  priority = false,
  alt = '',
  className = 'jp-img',
}: {
  photo: JoinPhoto
  sizes: string
  frame?: number
  priority?: boolean
  alt?: string
  className?: string
}) {
  const cropped = frame ? Math.max(1, photo.width / photo.height / frame) : 1
  const scale = Math.round(cropped * (photo.zoom ?? 1) * 100) / 100
  return (
    <PublicImage
      src={photo.src}
      width={photo.width}
      height={photo.height}
      sizes={capDensity(scale > 1 ? scaleSizes(sizes, scale) : sizes)}
      priority={priority}
      alt={alt}
      className={className}
      style={{
        objectPosition: photo.focus,
        transform: photo.zoom ? `scale(${photo.zoom})` : undefined,
      }}
    />
  )
}

/** Scales each entry's width, never its media condition: "72px" → "134px", "50vw" → "calc((50vw) * 1.78)". */
export function scaleSizes(sizes: string, scale: number): string {
  return sizes
    .split(',')
    .map((entry) => {
      const match = entry.trim().match(/^(\(.*\)\s+)?(.+)$/)
      if (!match) return entry
      const [, media = '', width] = match
      const px = width.match(/^(\d+(?:\.\d+)?)px$/)
      return `${media}${px ? `${Math.ceil(Number(px[1]) * scale)}px` : `calc((${width}) * ${scale})`}`
    })
    .join(', ')
}

/**
 * Phones at 2.6x and 3x would otherwise fetch the full file for every photo,
 * and on a slow link the hero then waits behind them. The bar is sharp at 2x
 * (01-DESIGN-AND-POLISH.md), so the phone entry (the one without a media
 * condition) is scaled down on those screens to ask for about a 2x file.
 * Entries with a width condition (tablets, desktops) are left alone.
 */
export function capDensity(sizes: string): string {
  const entries = sizes.split(',').map((entry) => entry.trim())
  const last = entries.at(-1)
  if (!last || last.startsWith('(')) return sizes
  return [
    ...entries.slice(0, -1),
    // 3x phones (iPhones) ask for 2x; 2.4x-2.9x phones (most Androids) too.
    // At 0.8 a 2.625x Pixel asked for 1024px and got the 1920px file.
    `(min-resolution: 2.9dppx) calc((${last}) * 0.66)`,
    `(min-resolution: 2.4dppx) calc((${last}) * 0.72)`,
    last,
  ].join(', ')
}
