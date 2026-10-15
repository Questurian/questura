import { Archivo } from 'next/font/google'

/**
 * The banner face: Archivo narrowed on its width axis and set heavy, for
 * words that run big over photos (the section mastheads' EAT, STAY,
 * ITINERARIES). The site's text faces thin out at that size.
 *
 * Declared here, not in the root layout, so only routes that render a banner
 * load it. Use `BANNER_TYPE` for the narrow, heavy cut.
 */
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], display: 'swap' })

export const BANNER_TYPE = `${archivo.className} font-extrabold uppercase [font-variation-settings:'wdth'_72]`
