/**
 * What the "What membership unlocks" rows on /join show (Design 101, built in
 * questurian-studio's join studio and approved 2026-10-18).
 *
 * Every photo is a file the site already serves from its CDN, so each one gets
 * the width ladder (`buildSrcSet`) and nothing is copied into the repo. They
 * are fixed picks, not live reads: the six category photos are the Eat, Stay
 * and Itineraries mastheads as of 2026-10-16, and the articles and places are
 * real Lima pages. If one of those media files is ever deleted from the CMS,
 * its card here goes blank; pick a replacement from the live page.
 *
 * Copy rule: nothing here may promise a feature the site does not have. The
 * design's plan cards listed "Audio versions of articles"; there is no audio,
 * so that line was left out.
 */

const CDN = 'https://questurian-cdn.b-cdn.net/media'

export type CategoryPhoto = {
  category: 'Eat' | 'Stay' | 'Itineraries'
  photo: 1 | 2
  src: string
}

/** Eat 1, Stay 1, Itineraries 1, then the second of each, as the mastheads order them. */
export const CATEGORY_PHOTOS: CategoryPhoto[] = [
  { category: 'Eat', photo: 1, src: `${CDN}/photo-4717161myg_wide.webp` },
  { category: 'Stay', photo: 1, src: `${CDN}/photo-7666946vjp_wide.webp` },
  { category: 'Itineraries', photo: 1, src: `${CDN}/questurian-peru-barranco-36_wide.webp` },
  { category: 'Eat', photo: 2, src: `${CDN}/al-pastor-on-the-trompo_wide.jpg` },
  { category: 'Stay', photo: 2, src: `${CDN}/miraflores-park-a-belmond-hotel-lima_instagram-388-position-2_wide-3.webp` },
  { category: 'Itineraries', photo: 2, src: `${CDN}/location-561ma2_wide.webp` },
]

export type StoryCard = {
  section: string
  title: string
  dek: string
  byline: string
  src: string
}

const lomoSaltado: StoryCard = {
  section: 'Maps',
  title: 'The Best Lomo Saltado in Lima',
  dek: 'Lima’s classic stir-fry, from market stalls to criollo taverns.',
  byline: 'By Alan Malpartida',
  src: `${CDN}/composite-the-best-lomo-saltado-in-lima-1791566602031_square.webp`,
}

const chifa: StoryCard = {
  section: 'Maps',
  title: 'The Best Chifa Restaurants in Lima',
  dek: 'Chinese and Peruvian flavors, from fried rice to sizzling noodles.',
  byline: 'By Alan Malpartida',
  src: `${CDN}/composite-the-best-chifa-restaurants-in-lima-1791844562271_thumbnail.webp`,
}

const fineDining: StoryCard = {
  section: 'Maps',
  title: 'The Best Fine Dining Restaurants in Lima',
  dek: 'Hidden gems and acclaimed restaurants, from Surquillo to Barranco.',
  byline: 'By Alan Malpartida',
  src: `${CDN}/composite-the-best-fine-dining-restaurants-in-lima-1791487494053_square.webp`,
}

const limaGuide: StoryCard = {
  section: 'Guides',
  title: 'The Questurian Guide to Lima',
  dek: 'Explore Lima, Peru, with our guide to the city.',
  byline: 'By Questurian Editors',
  src: `${CDN}/the-87470990xk_wide.webp`,
}

const drinkSpiking: StoryCard = {
  section: 'Intel',
  title: 'The Drink-Spiking Problem: How to Protect Yourself on a Night Out in Lima',
  dek: 'Stay safe in Lima: protect yourself from drink spiking. Know what to watch for before a night out.',
  byline: 'By Questurian Editors',
  src: `${CDN}/the-240772nf0e_wide.webp`,
}

const nightclubs: StoryCard = {
  section: 'Maps',
  title: 'The Best Nightclubs in Miraflores & Barranco',
  dek: 'Where to dance until dawn, from reggaeton discos to bohemian live music venues.',
  byline: 'By Questurian Editors',
  src: `${CDN}/instagram-242-legacy-9-source-2153_wide.webp`,
}

/** One fanned spread of three cards: the middle one sits on top. */
export type StorySpread = {
  choice: string
  label: string
  tilt: 'left' | 'right'
  cards: [left: StoryCard, middle: StoryCard, right: StoryCard]
}

export const CITY_GUIDE_SPREADS: StorySpread[] = [
  {
    choice: 'Local classics',
    label: 'Cards for Lima’s chifa, lomo saltado and fine-dining guides, tilted left.',
    tilt: 'left',
    cards: [lomoSaltado, chifa, fineDining],
  },
  {
    choice: 'Fine dining',
    label: 'Cards for Lima’s chifa, lomo saltado and fine-dining guides, tilted right.',
    tilt: 'right',
    cards: [chifa, fineDining, lomoSaltado],
  },
]

export const LOCAL_INTEL_SPREADS: StorySpread[] = [
  {
    choice: 'Practical intel',
    label: 'Dark article covers: drink-spiking reporting, Lima city guide and nightlife.',
    tilt: 'left',
    cards: [limaGuide, drinkSpiking, nightclubs],
  },
  {
    choice: 'Nightlife',
    label: 'Dark nightlife and practical reporting article covers.',
    tilt: 'right',
    cards: [drinkSpiking, nightclubs, { ...limaGuide, dek: 'The places, stories, and details worth knowing.' }],
  },
]

export type ListiclePlace = {
  choice: string
  name: string
  /** The line the listicle prints under the photo. */
  caption: string
  price: string
  description: string
  idealFor: string
  address: string
  /** Where the listicle's carousel stood in the capture: "2 / 5". */
  photoPosition: string
  photo: string
  latitude: number
  longitude: number
}

/** From the live dining rows (XOMA is dining 262, Contraste 449). */
export const LISTICLE_PLACES: ListiclePlace[] = [
  {
    choice: 'XOMA',
    name: 'XOMA Gastronómico',
    caption: 'XOMA Gastronómico',
    price: '$$$$',
    description: 'Andean ingredients and French training, with a seven-course tasting menu at dinner.',
    idealFor: 'Business dining',
    address: 'Elías Aguirre 179, Miraflores',
    photoPosition: '2 / 5',
    photo: `${CDN}/xoma-gastronmico_1779500469925_wide-5.webp`,
    latitude: -12.1183162,
    longitude: -77.0349372,
  },
  {
    choice: 'Contraste',
    name: 'Contraste',
    caption: 'Contraste',
    price: '$$$$',
    description: 'Peruvian produce with French technique, from scallops in tiger’s milk to duck confit.',
    idealFor: 'Wine lovers',
    address: 'Av. La Paz 604, Miraflores',
    photoPosition: '1 / 4',
    photo: `${CDN}/1791313887976-source-2037_wide.webp`,
    latitude: -12.123536,
    longitude: -77.0269541,
  },
]

/*
 * The listicle map's light grey look, as Static Maps URL styles. The site's
 * own map id only styles JavaScript maps, so a static map cannot reuse it.
 */
const MAP_STYLES = [
  'element:geometry|color:0xf2f2f2',
  'element:labels.icon|visibility:off',
  'element:labels.text.fill|color:0x616161',
  'element:labels.text.stroke|color:0xf5f5f5',
  'feature:poi|visibility:off',
  'feature:poi.park|visibility:on',
  'feature:poi.park|element:geometry|color:0xd3ead2',
  'feature:poi.park|element:labels|visibility:off',
  'feature:road|element:geometry|color:0xffffff',
  'feature:road.highway|element:geometry|color:0xe6e6e6',
  'feature:transit|visibility:off',
  'feature:water|element:geometry|color:0xc9d7e4',
  'feature:landscape.man_made|element:geometry|color:0xebebeb',
]

/*
 * Requested at Static Maps' largest free size and drawn at about 260 CSS px,
 * so streets and labels shrink to the listicle map's scale and stay sharp at
 * 2x. Same ratio as the map half of the card.
 */
export const STATIC_MAP_SIZE = { width: 640, height: 720 }

/**
 * A Google Static Maps image of the place, or null without a Maps key.
 *
 * Google's terms send commercial pages to Maps Platform rather than
 * screenshots, so the map is a real Static Maps request (Essentials SKU: free
 * up to 10,000 a month on the billing account). Builds without a key (CI, the
 * readiness sandbox) get null, and the card draws its plain fallback instead
 * of an image that would fail.
 */
export function staticMapUrl(place: Pick<ListiclePlace, 'latitude' | 'longitude'>, apiKey: string | undefined): string | null {
  if (!apiKey) return null
  const at = `${place.latitude},${place.longitude}`
  const params = new URLSearchParams({
    center: at,
    zoom: '16',
    size: `${STATIC_MAP_SIZE.width}x${STATIC_MAP_SIZE.height}`,
    markers: `color:0x3B5BDB|${at}`,
  })
  for (const style of MAP_STYLES) params.append('style', style)
  params.set('key', apiKey)
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}
