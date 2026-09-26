/**
 * Blurbs are meant to reach the site as HTML: the API converts each stored
 * Lexical document with Payload's converter (server:
 * features/articles/public/serializeArticleBlocks.ts). One path skipped that
 * step — a legacy single-day itinerary's top-level `whereStaying` — and the
 * raw Lexical JSON object went straight into `dangerouslySetInnerHTML`, which
 * printed "[object Object]" on every itinerary's "Where you're staying" card
 * (2026-09-26 live sweep).
 *
 * `blurbHtml` takes whatever arrives and returns HTML or null: a string is
 * already the server's HTML and passes through; a Lexical document is
 * rendered here. It covers the nodes the blurb editor produces (paragraphs,
 * headings, text formats, line breaks, links, lists, quotes, rules). An
 * unknown element node keeps its children; nothing unknown is ever emitted as
 * markup. All text is escaped, and a link keeps its href only when it is
 * http(s), mailto, or site-relative.
 *
 * Dependency-free so the client's node:test suite can run it.
 */

type LexicalNode = {
  type?: unknown
  text?: unknown
  format?: unknown
  tag?: unknown
  listType?: unknown
  children?: unknown
  url?: unknown
  fields?: unknown
}

const TEXT_FORMATS: Array<[bit: number, tag: string]> = [
  [16, 'code'],
  [1, 'strong'],
  [2, 'em'],
  [8, 'u'],
  [4, 's'],
  [32, 'sub'],
  [64, 'sup'],
]

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  if (/^(https?:|mailto:)/i.test(href)) return href
  return null
}

function renderChildren(node: LexicalNode): string {
  return Array.isArray(node.children)
    ? node.children.map((child) => renderNode(child)).join('')
    : ''
}

function renderText(node: LexicalNode): string {
  let html = escapeHtml(typeof node.text === 'string' ? node.text : '')
  const format = typeof node.format === 'number' ? node.format : 0
  for (const [bit, tag] of TEXT_FORMATS) {
    if (format & bit) html = `<${tag}>${html}</${tag}>`
  }
  return html
}

function renderLink(node: LexicalNode): string {
  const fields = isRecord(node.fields) ? node.fields : {}
  const href = safeHref(fields.url ?? node.url)
  const inner = renderChildren(node)
  if (!href) return inner
  const newTab = fields.newTab === true
  const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
  return `<a href="${escapeHtml(href)}"${target}>${inner}</a>`
}

function renderNode(value: unknown): string {
  if (!isRecord(value)) return ''
  const node = value as LexicalNode
  switch (node.type) {
    case 'text':
      return renderText(node)
    case 'linebreak':
      return '<br>'
    case 'tab':
      return ' '
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`
    case 'heading': {
      const tag = typeof node.tag === 'string' && HEADING_TAGS.has(node.tag) ? node.tag : 'h3'
      return `<${tag}>${renderChildren(node)}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${renderChildren(node)}</blockquote>`
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node)}</${tag}>`
    }
    case 'listitem':
      return `<li>${renderChildren(node)}</li>`
    case 'link':
    case 'autolink':
      return renderLink(node)
    case 'horizontalrule':
      return '<hr>'
    default:
      return renderChildren(node)
  }
}

/** Renders a Lexical editor state (`{ root: { children } }`) to HTML. */
export function lexicalToHtml(state: unknown): string {
  if (!isRecord(state) || !isRecord(state.root)) return ''
  return renderChildren(state.root as LexicalNode)
}

/** A blurb as HTML, whether it arrived as the server's HTML or as Lexical. */
export function blurbHtml(blurb: unknown): string | null {
  if (typeof blurb === 'string') return blurb.trim() ? blurb : null
  const html = lexicalToHtml(blurb)
  // A document of empty paragraphs is an empty blurb, not a blank gap.
  return html.replace(/<p><\/p>/g, '').trim() ? html : null
}
