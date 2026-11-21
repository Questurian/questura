/**
 * The site's own link preview (1200×630): the card a chat app or social
 * network draws when someone pastes questurian.com. Same family as the Join
 * card (warm ground, blue kicker, serif headline), with the wordmark as a
 * masthead and the Miraflores cliffs from the Lima guide. It names no city
 * (owner, 2026-11-21: the homepage card is the site's, not Lima's).
 *
 * Source: design-assets/share/questurian-share.html, screenshotted at
 * 1200×630. A new picture gets a new file name: chat apps cache a preview by
 * its image URL.
 *
 * Used by the homepage and the Lima pages. A page with its own picture (a
 * guide, a section page, /join) keeps it.
 *
 * Relative: the root layout's `metadataBase` makes it absolute.
 */
export const SITE_SHARE_IMAGE = {
  url: '/images/share/questurian-share-1200x630.jpg',
  width: 1200,
  height: 630,
  alt: 'Questurian travel guides: the places worth going.',
}
