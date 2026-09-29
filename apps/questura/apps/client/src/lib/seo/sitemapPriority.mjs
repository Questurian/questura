/**
 * Sitemap `<priority>` per kind of page. Besides ranking, the content value is
 * how `scripts/check-structured-data.mjs` picks the article pages out of the
 * public sitemap, so the two can never disagree about which pages are
 * articles.
 */
export const SITEMAP_PRIORITY = Object.freeze({
  home: 1.0,
  hub: 0.8,
  index: 0.5,
  content: 0.7,
})
