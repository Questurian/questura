/**
 * Every photo the two /join designs draw (A "The trip", B "The front page").
 *
 * All are files the site already serves from its CDN, so each gets the width
 * ladder (`buildSrcSet`) and nothing is copied into the repo. They are fixed
 * picks, not live reads: if one is deleted from the CMS its frame goes blank,
 * so pick a replacement from a live guide. Width and height are the variant
 * file's own pixels (server `VARIANT_SPECS`), which also give the frame its
 * ratio before the file arrives.
 *
 * Never use a Google map picture here, and never a photo that is not Lima:
 * the old page showed a beach in Rio and Mexican food as Lima's.
 */

const CDN = 'https://questurian-cdn.b-cdn.net/media/'

export type JoinPhoto = {
  src: string
  width: number
  height: number
  /** `object-position` for the crop, when the middle is not the subject. */
  focus?: string
  /**
   * Cover art drawn with its own border: zoomed to its photo, so the border
   * never shows inside a thumbnail.
   */
  zoom?: number
  /** The point the zoom grows from, when the middle is not the subject. */
  origin?: string
}

const SHAPES = {
  square: [1080, 1080],
  wide: [1920, 1080],
  thumbnail: [1200, 800],
  portrait: [1200, 1500],
  hero: [2100, 900],
  editorial: [1600, 1200],
} as const

function photo(file: string, extra: Omit<JoinPhoto, 'src' | 'width' | 'height'> = {}): JoinPhoto {
  const shape = (Object.keys(SHAPES) as Array<keyof typeof SHAPES>).find((name) =>
    new RegExp(`_(?:.*-)?${name}(?:-\\d+)?\\.(?:webp|jpg)$`).test(file),
  )
  if (!shape) throw new Error(`join photo without a known shape: ${file}`)
  const [width, height] = SHAPES[shape]
  return { src: `${CDN}${file}`, width, height, ...extra }
}

export const PHOTOS = {
  // A's hero: the portrait file on phones (1200x1500), the 21:9 one on wide screens.
  coastPortrait: photo('photo-1760118499459-037762cad6db_portrait.webp', { focus: '78% 50%' }),
  coastHero: photo('photo-1760118499459-037762cad6db_hero.webp', { focus: '70% 60%' }),
  road: photo('questurian-peru-barranco-20_thumbnail.webp'),
  cathedral: photo('1794289163133-source-2475_wide.webp', { focus: '50% 30%' }),
  dunes: photo('questurian-peru-barranco-36_wide.webp', { focus: '50% 60%' }),
  sunsetWide: photo('instagram-803-position-0-source-4429_wide.webp', { focus: '50% 48%' }),
  sunsetSquare: photo('instagram-803-position-0-source-4429_square.webp'),
  club: photo('casa-bulbo_instagram-242-legacy-9_square-1.webp', { focus: '50% 30%' }),
  cevicheSquare: photo('1791208292180-source-1947_square.webp', { focus: '40% 45%', zoom: 1.28, origin: '36% 36%' }),
  anticucho: photo('1792802780046-source-2217_square.webp'),
  fine: photo('astrid-y-gastn_1779500348037_square-7.webp', { focus: '50% 55%' }),
  lomo: photo('el-rey-del-lomo_1791164193909_square.webp'),
  chifa: photo('the-261005pfaq_square.webp', { focus: '50% 55%', zoom: 1.08, origin: '50% 56%' }),
  // Zoomed on the bird (owner, 2026-11-22: "zoomed in just a tad bit").
  pollo: photo('la-lea-jr-de-la-unin_1791808713080_square.webp', { focus: '50% 60%', zoom: 1.42, origin: '62% 56%' }),
  rooftop: photo('1792949731837-source-2346_square.webp', { focus: '50% 45%' }),
  sandwich: photo('1792888392968-source-2250_square.webp', { focus: '50% 60%' }),
  brunch: photo('ch-ch-miraflores_1770091514657_wide-1.webp', { focus: '50% 42%' }),
  bars: photo('google-3238-source-4157_square.webp'),
  isidro: photo('astrid-y-gastn_1769830926270_wide-6.webp', { focus: '60% 40%' }),
  oneDay: photo('composite-one-day-in-lima-peru-historic-sites-walking-tour-and-evening-nightlife-guide-1793652831112_square.webp'),
  night: photo('composite-how-to-spend-a-night-in-barranco-lima-1794723071041_square.webp'),
  central: photo('instagram-172-legacy-0-source-2993_square.webp'),
  ocean: photo('oceanfront-condo-with-a-terrace_square.jpg', { focus: '50% 45%' }),
  pool: photo('18th-floor-ocean-view-apartment-in-barranco_square.jpg', { focus: '50% 45%' }),
  terrace: photo('studio-with-a-rooftop-terrace-near-the-cliffs_square.webp'),
  room: photo('art-filled-tower-loft-in-a-restored-barranco-house_square.jpg'),
  homes: photo('composite-the-best-airbnbs-in-miraflores-1791660566409_editorial.webp'),
  loft: photo('boutique-loft-in-the-hotel-zone_square.jpg'),
} satisfies Record<string, JoinPhoto>

export type PhotoKey = keyof typeof PHOTOS
