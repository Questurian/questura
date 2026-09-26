/**
 * A homepage row renders as the city page only when it has blocks to show.
 *
 * An enabled homepage with zero blocks (Medellín and Mexico City, 2026-09-26)
 * used to count as "curated", so the page rendered header, nothing, footer —
 * while the city's articles sat unused. With no blocks the page falls back to
 * the article list, exactly as if there were no homepage row at all.
 *
 * Dependency-free so the client's node:test suite can run it.
 */
export function curatedHomepage<T extends { pageBlocks?: unknown[] | null }>(
  data: T | null | undefined,
): T | null {
  if (!data) return null
  return Array.isArray(data.pageBlocks) && data.pageBlocks.length > 0 ? data : null
}
