/**
 * Writes public/images/moment-icons.svg: one <symbol> per itinerary moment,
 * id = the moment's value. ItineraryMomentBadge draws a badge with
 * <use href="…moment-icons.svg#<moment>">, so the icons are a cached image
 * file instead of page JavaScript (the itinerary page is over its
 * first-load JS cap and may not grow; see perf/budgets.json).
 *
 * Run after adding or changing a moment: node scripts/build-moment-icons.mjs
 * then bump MOMENT_ICON_SPRITE's ?v= in ItineraryMomentBadge.tsx.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as lucide from 'lucide-react'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/images/moment-icons.svg')

/** Drawn in Lucide's style (24 grid, round caps) where Lucide has no icon. */
const CUSTOM = {
  // A footbridge with railings on an arch, like Barranco's Puente de los Suspiros.
  Bridge: ['M2 8h20', 'M2 12h20', 'M6 8v4', 'M12 8v4', 'M18 8v4', 'M4 12v9', 'M20 12v9', 'M4 21a8 6.5 0 0 1 16 0'],
  // A cliff edge over the sea.
  Clifftop: [
    'M2 21V5h7l3 3v13',
    'M14 14c1.17 0 1.17 1 2.33 1s1.17-1 2.34-1 1.16 1 2.33 1',
    'M14 18c1.17 0 1.17 1 2.33 1s1.17-1 2.34-1 1.16 1 2.33 1',
  ],
  // A lighthouse with its lamp room and two beams.
  Lighthouse: ['M6 21h12', 'M9 21l1-12h4l1 12', 'M10 9V6h4v3', 'M9.5 6 12 3l2.5 3', 'M10.5 15h3', 'M3 5l4 2', 'M21 5l-4 2'],
}

/** Moment value → icon. Keep in step with ITINERARY_MOMENT_OPTIONS (server) and MOMENT_LABELS (badge). */
export const MOMENT_ICONS = {
  breakfast: 'Croissant',
  coffee: 'Coffee',
  'morning-walk': 'Footprints',
  'remote-work': 'Laptop',
  'coworking-stop': 'Laptop',
  lunch: 'Sandwich',
  'street-food': 'CookingPot',
  'sweet-treat': 'IceCreamBowl',
  seafood: 'Fish',
  soup: 'Soup',
  grill: 'Flame',
  bakery: 'Wheat',
  'tasting-menu': 'ChefHat',
  culture: 'Palette',
  'historic-site': 'ScrollText',
  'museum-visit': 'University',
  landmark: 'Landmark',
  church: 'Church',
  ruins: 'Pyramid',
  palace: 'Castle',
  bridge: 'Bridge',
  lighthouse: 'Lighthouse',
  'art-gallery': 'Image',
  'street-art': 'SprayCan',
  'literary-stop': 'BookOpen',
  'guided-tour': 'Map',
  'local-market': 'Store',
  shopping: 'ShoppingBag',
  outdoor: 'Trees',
  'beach-time': 'Waves',
  'scenic-viewpoint': 'Binoculars',
  clifftop: 'Clifftop',
  oasis: 'TreePalm',
  wildlife: 'Bird',
  'wellness-break': 'Sparkles',
  'active-adventure': 'Bike',
  'boat-ride': 'Sailboat',
  pier: 'Anchor',
  'day-trip': 'Car',
  'bus-ride': 'BusFront',
  'in-transit': 'Route',
  sunset: 'Sunset',
  'rooftop-stop': 'Building2',
  dinner: 'UtensilsCrossed',
  cocktails: 'Martini',
  drinks: 'Wine',
  nightlife: 'Music2',
}

function innerOf(name) {
  if (CUSTOM[name]) return CUSTOM[name].map((d) => `<path d="${d}"/>`).join('')
  const Icon = lucide[name]
  if (!Icon) throw new Error(`lucide-react has no icon "${name}"`)
  const svg = renderToStaticMarkup(createElement(Icon))
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/><\/(path|circle|rect|line|polyline|polygon|ellipse)>/g, '/>')
}

const symbols = Object.entries(MOMENT_ICONS)
  .map(([moment, name]) => `<symbol id="${moment}" viewBox="0 0 24 24">${innerOf(name)}</symbol>`)
  .join('\n')

writeFileSync(OUT, `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols}\n</svg>\n`)
console.log(`Wrote ${Object.keys(MOMENT_ICONS).length} moment icons to ${OUT}`)
