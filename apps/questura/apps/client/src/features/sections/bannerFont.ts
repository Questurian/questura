import { Archivo } from 'next/font/google'

/**
 * The banner face: Archivo narrowed on its width axis and set heavy, for
 * words that run big over photos (the section mastheads' EAT, STAY,
 * ITINERARIES). The site's text faces thin out at that size.
 *
 * Declared here, not in the root layout, so only routes that render a banner
 * load it. Use `BANNER_TYPE` for the narrow, heavy cut.
 *
 * `preload: false`: with a preload, every prefetch of a section page (the
 * navbar's Eat, Stay and Itineraries links prefetch on every page) carried a
 * hint that made the browser fetch this 90 kB variable font on pages that
 * never show a banner. On Slow 3G that cost every page about two seconds
 * (e2e journey 12). Without it the font loads when a banner first uses it;
 * `display: 'swap'` shows the fallback face until then.
 */
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], display: 'swap', preload: false })

export const BANNER_TYPE = `${archivo.className} font-extrabold uppercase [font-variation-settings:'wdth'_72]`
