/**
 * The site's own link preview (1200×630): the card a chat app or social
 * network draws when someone pastes questurian.com, or a Lima page that has no
 * photo of its own. Same family as the Join card (warm ground, blue kicker,
 * serif headline, the wordmark), with the Miraflores cliffs from the Lima
 * guide. Source: design-assets/share/questurian-lima-share.html, screenshotted
 * at 1200×630.
 *
 * It says "Lima · Peru", so it belongs to Lima pages only. A page with its own
 * picture (a guide, a section page, /join) keeps it.
 *
 * Relative: the root layout's `metadataBase` makes it absolute.
 */
export const SITE_SHARE_IMAGE = {
  url: '/images/share/questurian-lima-share-1200x630.jpg',
  width: 1200,
  height: 630,
  alt: 'Questurian: where to eat and where to stay in Lima, Peru.',
}
