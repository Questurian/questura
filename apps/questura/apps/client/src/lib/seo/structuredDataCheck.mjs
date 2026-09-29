/**
 * Checks one public article page's structured data (JSON-LD) against what
 * Google needs to read it as one article: the "Questurian Structured Data
 * Plan", phase 1.
 *
 * Works on the served HTML only, so it measures what a crawler sees on the
 * real domain, not what the code meant to print. Pure, so node:test covers
 * every rule; `scripts/check-structured-data.mjs` fetches the pages.
 *
 * Rules, each a plain pass or fail with the reason:
 *   json      every JSON-LD block parses
 *   article   exactly one article entry on the page
 *   address   the article's address is the page's canonical address
 *   author    a real person (never a service account) linked to /authors/<slug>
 *   dates     datePublished and dateModified, ISO 8601 with a time zone
 *   image     at least one absolute https picture
 *   paywall   paid page: the paid flag and a class selector on that same
 *             article entry, pointing at an element the page has; free page:
 *             not marked paid
 */

export const RULES = ['json', 'article', 'address', 'author', 'dates', 'image', 'paywall']

const ARTICLE_TYPES = new Set([
  'Article',
  'NewsArticle',
  'BlogPosting',
  'Report',
  'ScholarlyArticle',
  'TechArticle',
])

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const SERVICE_ACCOUNT = /service\s*account/i

/** The raw text of every `<script type="application/ld+json">` block. */
export function extractJsonLdBlocks(html) {
  const blocks = []
  const re = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(html))) blocks.push(match[1])
  return blocks
}

/** The `<link rel="canonical">` href, or null. */
export function extractCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  for (const link of links) {
    if (!/\brel=["']canonical["']/i.test(link)) continue
    const href = link.match(/\bhref=["']([^"']+)["']/i)
    if (href) return decodeEntities(href[1])
  }
  return null
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function typesOf(node) {
  const type = node['@type']
  if (typeof type === 'string') return [type]
  if (Array.isArray(type)) return type.filter((t) => typeof t === 'string')
  return []
}

function isArticle(node) {
  return typesOf(node).some((type) => ARTICLE_TYPES.has(type))
}

/** Top-level nodes of one parsed block: its `@graph` members, or itself. */
function topNodes(parsed) {
  const roots = Array.isArray(parsed) ? parsed : [parsed]
  const nodes = []
  for (const root of roots) {
    if (!isObject(root)) continue
    if (Array.isArray(root['@graph'])) {
      for (const member of root['@graph']) if (isObject(member)) nodes.push(member)
      // A root that has its own type as well as a graph is a node too.
      if (typesOf(root).length > 0) nodes.push(root)
    } else {
      nodes.push(root)
    }
  }
  return nodes
}

/** Every node with an `@id`, nested ones included, so references resolve. */
function indexById(nodes) {
  const byId = new Map()
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!isObject(value)) return
    const id = value['@id']
    // A bare `{ "@id": … }` is a reference, not the node itself.
    if (typeof id === 'string' && Object.keys(value).length > 1 && !byId.has(id)) {
      byId.set(id, value)
    }
    Object.values(value).forEach(visit)
  }
  nodes.forEach(visit)
  return byId
}

function resolve(value, byId) {
  if (isObject(value) && typeof value['@id'] === 'string' && Object.keys(value).length === 1) {
    return byId.get(value['@id']) ?? value
  }
  return value
}

function asList(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** Compares page addresses, ignoring one trailing slash and the fragment. */
export function sameAddress(a, b) {
  const norm = (value) => {
    try {
      const url = new URL(value)
      url.hash = ''
      const text = url.toString()
      return text.endsWith('/') && url.pathname !== '/' ? text.slice(0, -1) : text
    } catch {
      return null
    }
  }
  const left = norm(a)
  return left !== null && left === norm(b)
}

function pageAddressOf(value, byId) {
  if (typeof value === 'string') return value
  const node = resolve(value, byId)
  if (!isObject(node)) return null
  if (typeof node.url === 'string') return node.url
  if (typeof node['@id'] === 'string') return node['@id']
  return null
}

function checkAddress(article, canonical, byId) {
  if (!canonical) return fail('the page has no canonical link to compare with')

  const claims = []
  if (typeof article.url === 'string') claims.push(['url', article.url])
  if (article.mainEntityOfPage !== undefined) {
    claims.push(['mainEntityOfPage', pageAddressOf(article.mainEntityOfPage, byId)])
  }
  if (claims.length === 0) return fail('no url or mainEntityOfPage')

  if (typeof article['@id'] === 'string' && /^https?:/i.test(article['@id'])) {
    claims.push(['@id', article['@id']])
  }

  for (const [field, value] of claims) {
    if (typeof value !== 'string' || !sameAddress(value, canonical)) {
      return fail(`${field} is ${value ?? 'empty'}, canonical is ${canonical}`)
    }
  }
  return pass()
}

function checkAuthor(article, canonical, byId) {
  const authors = asList(article.author).map((author) => resolve(author, byId))
  if (authors.length === 0) return fail('no author')

  let origin = null
  try {
    origin = canonical ? new URL(canonical).origin : null
  } catch {
    origin = null
  }

  for (const author of authors) {
    if (!isObject(author)) return fail('author is not an object')
    const name = typeof author.name === 'string' ? author.name.trim() : ''
    if (!name) return fail('author has no name')
    if (SERVICE_ACCOUNT.test(name)) return fail(`author is "${name}"`)
    if (!typesOf(author).includes('Person')) return fail(`author "${name}" is not a Person`)
    const url = typeof author.url === 'string' ? author.url : ''
    const onSite = origin ? url.startsWith(`${origin}/authors/`) : /^https:\/\/[^/]+\/authors\//.test(url)
    if (!onSite) return fail(`author "${name}" has no /authors/ link (url: ${url || 'none'})`)
  }
  return pass()
}

function checkDates(article) {
  const published = article.datePublished
  const modified = article.dateModified
  const problems = []
  if (typeof published !== 'string') problems.push('no datePublished')
  else if (!ISO_DATE_TIME.test(published)) problems.push(`datePublished "${published}" is not ISO 8601 with a time zone`)
  if (typeof modified !== 'string') problems.push('no dateModified')
  else if (!ISO_DATE_TIME.test(modified)) problems.push(`dateModified "${modified}" is not ISO 8601 with a time zone`)
  if (problems.length > 0) return fail(problems.join('; '))
  if (Date.parse(modified) < Date.parse(published)) return fail('dateModified is before datePublished')
  return pass()
}

function imageUrls(value, byId) {
  const urls = []
  for (const item of asList(value)) {
    const image = resolve(item, byId)
    if (typeof image === 'string') urls.push(image)
    else if (isObject(image)) {
      if (typeof image.url === 'string') urls.push(image.url)
      else if (typeof image.contentUrl === 'string') urls.push(image.contentUrl)
    }
  }
  return urls
}

function checkImage(article, byId) {
  const urls = imageUrls(article.image, byId)
  if (urls.length === 0) return fail('no image')
  const bad = urls.find((url) => !/^https:\/\/[^/]+\//.test(url))
  if (bad) return fail(`image "${bad}" is not an absolute https address`)
  return pass()
}

/** True when the page has an element carrying `className`. */
function hasClass(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\bclass=["'][^"']*(?<![\\w-])${escaped}(?![\\w-])[^"']*["']`).test(html)
}

/** The page itself says it is paid: the site's paywall notice carries `data-paywalled`. */
function paidMarker(html) {
  return /\bdata-paywalled\b/.test(html)
}

function checkPaywall(article, nodes, html) {
  if (!paidMarker(html)) {
    const markedPaid = nodes.some((node) => node.isAccessibleForFree === false || node.isAccessibleForFree === 'False')
    return markedPaid ? fail('marked paid on a free page') : pass()
  }

  if (article.isAccessibleForFree !== false) {
    return fail('paid page, but the article entry has no isAccessibleForFree: false')
  }
  const parts = asList(article.hasPart).filter(isObject)
  const part = parts.find((p) => p.isAccessibleForFree === false)
  if (!part) return fail('paid page, but the article entry has no paid hasPart')
  const selector = typeof part.cssSelector === 'string' ? part.cssSelector.trim() : ''
  if (!/^\.[A-Za-z_][\w-]*$/.test(selector)) {
    return fail(`cssSelector "${selector || 'none'}" is not a class selector`)
  }
  if (!hasClass(html, selector.slice(1))) {
    return fail(`no element on the page has class "${selector.slice(1)}"`)
  }
  return pass()
}

function pass() {
  return { ok: true, detail: '' }
}

function fail(detail) {
  return { ok: false, detail }
}

/**
 * @param {string} html the served page
 * @returns {{ ok: boolean, canonical: string | null, results: Record<string, { ok: boolean, detail: string }> }}
 */
export function checkArticleStructuredData(html) {
  const canonical = extractCanonical(html)
  const results = {}
  const nodes = []
  const broken = []

  extractJsonLdBlocks(html).forEach((block, index) => {
    try {
      nodes.push(...topNodes(JSON.parse(block)))
    } catch {
      broken.push(index + 1)
    }
  })
  results.json = broken.length > 0 ? fail(`block ${broken.join(', ')} is not valid JSON`) : pass()

  const byId = indexById(nodes)
  const articles = nodes.filter(isArticle)
  const article = articles.length === 1 ? articles[0] : null

  results.article =
    articles.length === 1
      ? pass()
      : fail(articles.length === 0 ? 'no article entry' : `${articles.length} article entries`)

  if (article) {
    results.address = checkAddress(article, canonical, byId)
    results.author = checkAuthor(article, canonical, byId)
    results.dates = checkDates(article)
    results.image = checkImage(article, byId)
    results.paywall = checkPaywall(article, nodes, html)
  } else {
    const skipped = fail('needs exactly one article entry')
    for (const rule of ['address', 'author', 'dates', 'image', 'paywall']) results[rule] = skipped
  }

  return { ok: RULES.every((rule) => results[rule].ok), canonical, results }
}
