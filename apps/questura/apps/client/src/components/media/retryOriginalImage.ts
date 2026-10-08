/**
 * Retry the existing base file once when a responsive candidate fails.
 *
 * The width-ladder rungs in `srcSet` are siblings the client derives from the
 * URL, so a variant uploaded without its ladder 404s on whichever rung the
 * browser picks, and `srcSet` has no fallback of its own. Dropping the ladder
 * makes the browser fetch the base variant, which the API said exists.
 * `<source>` elements keep their art direction: each falls back to its own
 * base crop (`data-fallback-src`), not to the `<img>`'s crop.
 *
 * Returns false when there was nothing to retry, or this src was already
 * retried, so a missing base file still reaches the caller's onError.
 */
export function retryOriginalImage(image: HTMLImageElement): boolean {
  const src = image.getAttribute('src') ?? ''
  if (image.getAttribute('data-ladder-retried') === src) return false

  const sources = Array.from(image.closest('picture')?.querySelectorAll('source') ?? [])
  const hasLadder = (element: Element) => {
    const srcset = element.getAttribute('srcset')
    return srcset !== null && srcset !== element.getAttribute('data-fallback-src')
  }
  if (!hasLadder(image) && !sources.some(hasLadder)) return false

  image.setAttribute('data-ladder-retried', src)
  for (const source of sources) {
    const fallback = source.getAttribute('data-fallback-src')
    if (fallback) source.setAttribute('srcset', fallback)
    else source.removeAttribute('srcset')
    source.removeAttribute('sizes')
  }
  image.removeAttribute('srcset')
  image.removeAttribute('sizes')
  return true
}
