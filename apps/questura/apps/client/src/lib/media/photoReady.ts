/**
 * Photos appear whole, never strip by strip.
 *
 * A JPEG or WebP that is shown while it downloads paints from the top down, so
 * on a phone the reader watches half a photo sit over its placeholder for a
 * second or two. That is the look of an unfinished page. Every reader-facing
 * photo (`PublicImage`) is drawn with `data-fade` and stays transparent over a
 * flat warm placeholder until its file has fully arrived; then it gets
 * `data-loaded` and fades in (CSS: `img[data-fade]` in foundations.css).
 *
 * Two things set `data-loaded`, and both are needed:
 *
 *  - PHOTO_READY_SCRIPT (photoReadyScript.ts), inline in <head>, listens for
 *    `load` on the whole document in the capture phase (load does not
 *    bubble). It runs before the body is parsed, so it sees every
 *    server-rendered photo finish, even ones that finish long before React
 *    hydrates.
 *  - `markPhotoReady` from PublicImage's own onLoad and ref. React can set an
 *    image's src before the element is in the document (a transition renders
 *    off-screen first), and a cached file can finish right then, where a
 *    document listener cannot hear it.
 *
 * A photo that never loads keeps its placeholder: a flat box reads better than
 * the browser's broken-image glyph.
 *
 * Dependency-free so node:test can run it.
 */

export const PHOTO_FADE_ATTRIBUTE = 'data-fade'
export const PHOTO_LOADED_ATTRIBUTE = 'data-loaded'

type PhotoElement = {
  tagName: string
  complete?: boolean
  naturalWidth?: number
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
}

/** Marks a faded photo as ready once its file has decoded to real pixels. */
export function markPhotoReady(image: PhotoElement | null | undefined): boolean {
  if (!image || image.tagName !== 'IMG') return false
  if (!image.hasAttribute(PHOTO_FADE_ATTRIBUTE)) return false
  if (image.complete === false || image.naturalWidth === 0) return false
  image.setAttribute(PHOTO_LOADED_ATTRIBUTE, '')
  return true
}
