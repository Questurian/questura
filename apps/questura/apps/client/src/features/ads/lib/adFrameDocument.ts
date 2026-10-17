/**
 * The document one Adsterra banner runs in.
 *
 * Every Adsterra banner reads its settings from one global, `atOptions`, and
 * draws with `document.write`. Run straight in the page, a second banner
 * overwrites the first one's settings, and `document.write` after load wipes
 * the whole React page. So each banner gets a document of its own, served by
 * the ad frame origin (`adFrameResponse`) into its own iframe (`AdsterraFrame`).
 *
 * `<base target="_blank">` sends a click to a new tab: the sandbox lets the ad
 * open one but never navigate the reader's page away.
 *
 * Dependency-free so node:test can import it.
 */

export type AdFrameUnit = { key: string; width: number; height: number }

const KEY_PATTERN = /^[a-z0-9]{16,64}$/i

export function adFrameDocument(unit: AdFrameUnit, scriptOrigin: string): string {
  // The key goes into a script tag and a URL. Only plain alphanumerics get in,
  // so nothing can close the tag or redirect the script.
  if (!KEY_PATTERN.test(unit.key)) {
    throw new Error('Ad unit key must be 16-64 letters and digits.')
  }
  const origin = new URL(scriptOrigin).origin
  const options = JSON.stringify({
    key: unit.key,
    format: 'iframe',
    height: unit.height,
    width: unit.width,
    params: {},
  })

  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<base target="_blank">',
    '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>',
    '</head><body>',
    `<script>atOptions=${options};</script>`,
    `<script src="${origin}/${unit.key}/invoke.js"></script>`,
    '</body></html>',
  ].join('')
}
