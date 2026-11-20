/**
 * Cuts a locked map guide's intro to a fixed length (owner decision,
 * 2026-11-20).
 *
 * Non-members used to get the whole intro. The paywall fade sits on its last
 * lines, so a long intro (the rooftop guide's ran to 531 words and named most
 * of the places) let a reader take nearly the whole list from the free part,
 * while a short one cut off fast. The owner wants every locked guide to cut
 * off at the same point, about as soon as the nightclub guide's 77-word intro.
 *
 * Done on the server, not with CSS, so the rest of the intro never reaches a
 * non-member's browser or the page source.
 *
 * The cut lands on the last sentence end at or before the limit. When that
 * would leave less than half the limit (one very long opening sentence), it
 * falls back to a hard cut at the limit with an ellipsis.
 *
 * Handles both forms the intro travels in: HTML after the public routes have
 * serialized it, and Lexical JSON on Payload's own REST/GraphQL surface
 * (`gateExternalApiRead`), where no serializer runs.
 */

const SENTENCE_END = /[.!?]["'”’)\]]*$/

type Cut = {
  /** Words to keep. */
  words: number
  /** True when the cut is mid-sentence and needs an ellipsis. */
  ellipsis: boolean
}

/** Where to cut a run of words, or null when it already fits. */
function planCut(words: string[], limit: number): Cut | null {
  if (words.length <= limit) return null
  let lastSentenceEnd = 0
  for (let i = 0; i < limit; i++) {
    if (SENTENCE_END.test(words[i] ?? '')) lastSentenceEnd = i + 1
  }
  if (lastSentenceEnd >= Math.ceil(limit / 2)) return { words: lastSentenceEnd, ellipsis: false }
  return { words: limit, ellipsis: true }
}

/** Words in a text run. An HTML entity counts as part of the word it sits in. */
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

const VOID_TAGS = new Set(['br', 'hr', 'img', 'wbr'])

/**
 * Keeps the first `limit` words of an intro's HTML, closing any tag left open.
 * Returns the input unchanged when it already fits.
 */
export function trimIntroHtml(html: string, limit: number): string {
  const tokens = html.match(/<[^>]*>|[^<]+/g) ?? []
  const allWords = tokens.filter((token) => !token.startsWith('<')).flatMap(wordsOf)
  const cut = planCut(allWords, limit)
  if (!cut) return html

  let out = ''
  let kept = 0
  const open: string[] = []

  for (const token of tokens) {
    if (token.startsWith('<')) {
      const closing = /^<\s*\/\s*([a-z0-9-]+)/i.exec(token)
      if (closing) {
        const name = closing[1]!.toLowerCase()
        const at = open.lastIndexOf(name)
        if (at !== -1) open.splice(at, 1)
        out += token
        continue
      }
      const opening = /^<\s*([a-z0-9-]+)/i.exec(token)
      if (opening && !token.endsWith('/>') && !VOID_TAGS.has(opening[1]!.toLowerCase())) {
        open.push(opening[1]!.toLowerCase())
      }
      out += token
      continue
    }

    // Split keeping whitespace, so the kept text reads exactly as written.
    const parts = token.split(/(\s+)/)
    for (const part of parts) {
      if (part === '') continue
      if (/^\s+$/.test(part)) {
        out += part
        continue
      }
      out += part
      kept++
      if (kept === cut.words) break
    }
    if (kept === cut.words) break
  }

  out = out.replace(/\s+$/, '')
  if (cut.ellipsis) out += '…'
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`
  return out
}

type LexicalNode = { type?: unknown; text?: unknown; children?: unknown }

function isNode(value: unknown): value is LexicalNode {
  return Boolean(value) && typeof value === 'object'
}

function lexicalWords(node: unknown): string[] {
  if (!isNode(node)) return []
  const own = typeof node.text === 'string' ? wordsOf(node.text) : []
  const children = Array.isArray(node.children) ? node.children.flatMap(lexicalWords) : []
  return [...own, ...children]
}

/**
 * Keeps the first `limit` words of an intro's Lexical JSON, returning a copy.
 * Nodes after the cut are dropped; containers left empty by it are dropped too.
 */
export function trimIntroLexical<T>(state: T, limit: number): T {
  if (!isNode(state)) return state
  const root = (state as { root?: unknown }).root
  const cut = planCut(lexicalWords(root), limit)
  if (!cut) return state

  let remaining = cut.words

  const walk = (node: LexicalNode): LexicalNode | null => {
    if (remaining <= 0) return null
    if (typeof node.text === 'string') {
      const parts = node.text.split(/(\s+)/)
      let text = ''
      for (const part of parts) {
        if (remaining <= 0) break
        text += part
        if (part !== '' && !/^\s+$/.test(part)) remaining--
      }
      if (remaining <= 0) {
        text = text.replace(/\s+$/, '')
        if (cut.ellipsis) text += '…'
      }
      return { ...node, text }
    }
    if (!Array.isArray(node.children)) return node
    const children: LexicalNode[] = []
    for (const child of node.children) {
      if (!isNode(child)) continue
      const kept = walk(child)
      if (kept) children.push(kept)
      if (remaining <= 0) break
    }
    return children.length > 0 || node.children.length === 0 ? { ...node, children } : null
  }

  return { ...(state as object), root: isNode(root) ? walk(root) : root } as T
}

/** Trims whichever form the intro is in. Anything else passes through. */
export function trimIntro(intro: unknown, limit: number): unknown {
  if (typeof intro === 'string') return trimIntroHtml(intro, limit)
  if (isNode(intro)) return trimIntroLexical(intro, limit)
  return intro
}
