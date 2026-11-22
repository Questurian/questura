/**
 * Finishes React's streamed Suspense swap on the server.
 *
 * A route with a `loading.tsx` (itineraries) is sent as the skeleton in
 * place, then the real body in `<div hidden id="S:n">`, then an inline script
 * that moves one over the other. Google's view has no scripts, so without
 * this the whole body, paid text included, would be `display: none`.
 *
 * Throws on anything it cannot place exactly; the caller then sends the
 * preview.
 */

const SEGMENT = /<div hidden(?:="")? id="S:([0-9a-f]+)">/
const DIV_TOKENS = /<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<div\b|<\/div>/g
const BOUNDARY_TOKENS = /<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--(\/?[$&][?~!]?)-->/g

/** Where the div whose content starts at `from` closes. */
function closingDiv(html: string, from: number): number {
  let depth = 0
  for (const match of html.slice(from).matchAll(DIV_TOKENS)) {
    if (match[0] === '<div') depth++
    else if (match[0] === '</div>') {
      if (depth === 0) return from + (match.index as number)
      depth--
    }
  }
  throw new Error('streamed segment is not closed')
}

/** Where the Suspense boundary whose fallback starts at `from` ends. */
function boundaryEnd(html: string, from: number): number {
  let depth = 0
  for (const match of html.slice(from).matchAll(BOUNDARY_TOKENS)) {
    const marker = match[1]
    if (!marker) continue
    if (marker === '/$' || marker === '/&') {
      if (depth === 0) return from + (match.index as number)
      depth--
    } else if (!marker.startsWith('/')) depth++
  }
  throw new Error('streamed boundary is not closed')
}

export function revealStreamed(page: string): string {
  let html = page
  for (let segment = SEGMENT.exec(html); segment; segment = SEGMENT.exec(html)) {
    const start = segment.index
    const contentStart = start + segment[0].length
    const contentEnd = closingDiv(html, contentStart)
    const content = html.slice(contentStart, contentEnd)
    const rest = html.slice(0, start) + html.slice(contentEnd + '</div>'.length)

    const open = `<!--$?--><template id="B:${segment[1]}"></template>`
    const at = rest.indexOf(open)
    if (at < 0) throw new Error('streamed segment has no boundary')

    const end = boundaryEnd(rest, at + open.length)
    html = `${rest.slice(0, at)}<!--$-->${content}${rest.slice(end)}`
  }
  return html
}
