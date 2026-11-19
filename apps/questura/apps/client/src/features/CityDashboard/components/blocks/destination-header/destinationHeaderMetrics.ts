import type { DestinationHeaderStyle, DestinationHeaderTextFont } from "../../../types";

/*
 * Measured once in the browser from each font's own glyphs (in em):
 *   cap      height of a capital H, by weight
 *   baseline distance from the top of a line box to its baseline, at the
 *            font's line height
 * They let the server-rendered header put the description's first capitals
 * exactly level with the name's and size the crumb flag to the crumb's
 * capitals, with no measuring in the visitor's browser.
 */
export const DEFAULT_DESTINATION_HEADER_STYLE: DestinationHeaderStyle = {
  textFont: "jost",
  textWeight: "300",
  textSize: "15",
  textTone: "grey",
  textAlign: "top",
};

type Metrics = {
  lineHeight: number;
  baseline: number;
  cap: { 300: number; 400: number; 500: number };
};

export const TEXT_METRICS: Record<DestinationHeaderTextFont, Metrics> = {
  jost: { lineHeight: 1.65, baseline: 1.17, cap: { 300: 0.7, 400: 0.7, 500: 0.7 } },
  // Lato ships 300 and 400 only; the 500 crumb draws with 400.
  lato: { lineHeight: 1.65, baseline: 1.21, cap: { 300: 0.7075, 400: 0.7165, 500: 0.7165 } },
  raleway: { lineHeight: 1.65, baseline: 1.18, cap: { 300: 0.71, 400: 0.71, 500: 0.71 } },
  manrope: { lineHeight: 1.65, baseline: 1.21, cap: { 300: 0.72, 400: 0.72, 500: 0.72 } },
  dmsans: { lineHeight: 1.65, baseline: 1.16, cap: { 300: 0.7, 400: 0.7, 500: 0.7 } },
  worksans: { lineHeight: 1.65, baseline: 1.17, cap: { 300: 0.66, 400: 0.66, 500: 0.66 } },
  serif: { lineHeight: 1.55, baseline: 1.09, cap: { 300: 0.625, 400: 0.625, 500: 0.625 } },
};

/** Playfair Display at line-height 1: baseline and cap height, in em. */
const NAME = { baseline: 0.91, cap: 0.708 };

export const NAME_SIZE_WIDE = 46;
export const CRUMB_SIZE = 12;
/** Space between the crumb and the name. */
export const CRUMB_GAP = 14;

/** The description's font weight: the serif reads best at its 500. */
export function textWeight(style: DestinationHeaderStyle): 300 | 400 | 500 {
  if (style.textFont === "serif") return 500;
  return style.textWeight === "400" ? 400 : 300;
}

/**
 * Crumb flag height: the crumb's capitals (set in weight 500, uppercase),
 * rounded to half a pixel so the flag's edges land on whole pixels of a
 * Retina screen and stay sharp at this size.
 */
export function crumbCapHeight(style: DestinationHeaderStyle): number {
  return Math.round(TEXT_METRICS[style.textFont].cap[500] * CRUMB_SIZE * 2) / 2;
}

/** Crumb flag width: 3:2, also on a half pixel. */
export function crumbFlagWidth(style: DestinationHeaderStyle): number {
  return Math.round(crumbCapHeight(style) * 1.5 * 2) / 2;
}

/**
 * Space above the description (tablet and up, "level with the name") so its
 * first capitals start on the name's cap line. Both sit in the grid row that
 * starts at the name's top margin.
 */
export function levelPaddingTop(style: DestinationHeaderStyle): number {
  const m = TEXT_METRICS[style.textFont];
  const size = Number(style.textSize);
  const nameCapTop = CRUMB_GAP + (NAME.baseline - NAME.cap) * NAME_SIZE_WIDE;
  const textCapTop = (m.baseline - m.cap[textWeight(style)]) * size;
  return Math.max(0, Math.round((nameCapTop - textCapTop) * 100) / 100);
}
