import { getPayload, type Where } from 'payload'

import config from '@/payload.config'
import { escapeHtml, htmlToText } from '@/features/emails/lib/email-utils'
import { INDEX_ITEM_DEPTH, INDEX_ITEM_SELECT, serializeIndexItem, type IndexItem } from '@/features/articles/public/indexItem'
import { isArticleTypeKey, TYPE_TO_COLLECTION, type ArticleTypeKey } from '@/features/articles/public/scope'
import { DEFAULT_LANG } from '@/shared/i18n/languageField'
import { APP_URLS } from '@/shared/config'

/**
 * A newsletter issue: a short note from the team, then the pieces published
 * since the last one.
 *
 * The composer (Studio) only ever sends *references* to articles. Titles,
 * excerpts, images and links are resolved here from published rows at render
 * time, so nothing a browser sends becomes markup in a mail to the list, and
 * an unpublished piece cannot be linked.
 */

const ARTICLE_TYPES: ArticleTypeKey[] = ['articles', 'maps', 'itineraries']
const TYPE_LABEL: Record<ArticleTypeKey, string> = { articles: 'Guide', maps: 'Map', itineraries: 'Itinerary' }

export const MAX_ISSUE_ITEMS = 20
export const MAX_SUBJECT_LENGTH = 150
export const MAX_NOTE_LENGTH = 5000

/** Resend replaces this with the reader's own one-click unsubscribe link. */
export const RESEND_UNSUBSCRIBE_PLACEHOLDER = '{{{RESEND_UNSUBSCRIBE_URL}}}'

export type IssueItemRef = { type: ArticleTypeKey; id: number }
export type IssueItem = IndexItem & { type: ArticleTypeKey }

export type IssueDraft = { subject: string; note: string; items: IssueItemRef[] }

/** Validates a draft from the composer; returns an error message or the clean draft. */
export function parseIssueDraft(body: unknown): IssueDraft | { error: string } {
  const raw = (body ?? {}) as { subject?: unknown; note?: unknown; items?: unknown }
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : ''
  if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
    return { error: `Subject is required (at most ${MAX_SUBJECT_LENGTH} characters).` }
  }
  const note = typeof raw.note === 'string' ? raw.note.trim() : ''
  if (note.length > MAX_NOTE_LENGTH) return { error: `The note is longer than ${MAX_NOTE_LENGTH} characters.` }
  if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > MAX_ISSUE_ITEMS) {
    return { error: `Pick between 1 and ${MAX_ISSUE_ITEMS} articles.` }
  }
  const items: IssueItemRef[] = []
  for (const item of raw.items as { type?: unknown; id?: unknown }[]) {
    const id = Number(item?.id)
    if (!isArticleTypeKey(item?.type) || !Number.isInteger(id) || id < 1) return { error: 'Invalid article reference.' }
    items.push({ type: item.type, id })
  }
  return { subject, note, items }
}

const published: Where = { and: [{ status: { equals: 'published' } }, { language: { equals: DEFAULT_LANG } }] }

/** Everything published after `since`, newest first, across guides, maps and itineraries. */
export async function findNewArticles(since: Date): Promise<IssueItem[]> {
  const payload = await getPayload({ config })
  const perType = await Promise.all(
    ARTICLE_TYPES.map(async (type) => {
      const { docs } = await payload.find({
        collection: TYPE_TO_COLLECTION[type],
        where: { and: [published, { publishedAt: { greater_than: since.toISOString() } }] },
        sort: '-publishedAt',
        limit: 50,
        depth: INDEX_ITEM_DEPTH,
        select: INDEX_ITEM_SELECT,
        overrideAccess: true,
      })
      return docs.map((doc) => ({ ...serializeIndexItem(doc, type), type }))
    }),
  )
  return perType.flat().sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

/** The referenced pieces that are still published, in the order given. */
export async function resolveIssueItems(refs: IssueItemRef[]): Promise<IssueItem[]> {
  const payload = await getPayload({ config })
  const resolved = new Map<string, IssueItem>()
  await Promise.all(
    ARTICLE_TYPES.map(async (type) => {
      const ids = refs.filter((ref) => ref.type === type).map((ref) => ref.id)
      if (ids.length === 0) return
      const { docs } = await payload.find({
        collection: TYPE_TO_COLLECTION[type],
        where: { and: [published, { id: { in: ids } }] },
        limit: ids.length,
        depth: INDEX_ITEM_DEPTH,
        select: INDEX_ITEM_SELECT,
        overrideAccess: true,
      })
      for (const doc of docs) resolved.set(`${type}:${doc.id}`, { ...serializeIndexItem(doc, type), type })
    }),
  )
  return refs.map((ref) => resolved.get(`${ref.type}:${ref.id}`)).filter((item): item is IssueItem => Boolean(item))
}

// Questurian's visual language (client foundations.css), inlined for mail.
const GROUND = '#F5F0E8'
const PAPER = '#EFE9DE'
const INK = '#1A1A1A'
const MUTED = '#5C5650'
const ACCENT = '#3B5BDB'
const RULE = '#D9D0C1'
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function siteUrl(href: string): string {
  return /^https?:\/\//.test(href) ? href : APP_URLS.frontendUrl(href)
}

function noteHtml(note: string): string {
  return note
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.65;color:${INK};">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('')
}

function itemHtml(item: IssueItem): string {
  const href = escapeHtml(siteUrl(item.href))
  const image = item.thumbnail
    ? `<a href="${href}" style="text-decoration:none;"><img src="${escapeHtml(item.thumbnail.url)}" alt="${escapeHtml(item.thumbnail.alt ?? item.title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;margin:0 0 14px;"></a>`
    : ''
  const excerpt = item.excerpt
    ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTED};">${escapeHtml(item.excerpt)}</p>`
    : ''
  return `
    <tr><td style="padding:0 0 32px;">
      ${image}
      <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};font-weight:600;">${TYPE_LABEL[item.type]}</p>
      <h2 style="margin:0 0 8px;font-family:${SERIF};font-size:23px;line-height:1.25;font-weight:600;"><a href="${href}" style="color:${INK};text-decoration:none;">${escapeHtml(item.title)}</a></h2>
      ${excerpt}
      <a href="${href}" style="font-family:${SANS};font-size:15px;font-weight:600;color:${ACCENT};text-decoration:none;">Read it →</a>
    </td></tr>`
}

function sectionLabel(label: string): string {
  return `<tr><td style="padding:8px 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};white-space:nowrap;padding-right:12px;">${escapeHtml(label)}</td>
    <td width="100%" style="border-bottom:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</td>
  </tr></table></td></tr>`
}

export type RenderOptions = {
  /** Where "unsubscribe" points. The live issue uses Resend's placeholder. */
  unsubscribeUrl: string
  postalAddress: string
  now?: Date
}

/** The issue as HTML and plain text. */
export function renderIssue(
  draft: { subject: string; note: string },
  items: IssueItem[],
  { unsubscribeUrl, postalAddress, now = new Date() }: RenderOptions,
): { html: string; text: string } {
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const preheader = (draft.note.split('\n').find((line) => line.trim()) ?? items[0]?.title ?? '').slice(0, 140)
  const note = draft.note
    ? `<tr><td style="padding:0 0 12px;">${noteHtml(draft.note)}<p style="margin:0 0 24px;font-family:${SERIF};font-size:16px;font-style:italic;color:${MUTED};">The Questurian Team</p></td></tr>`
    : ''
  const unsubscribe = unsubscribeUrl === RESEND_UNSUBSCRIBE_PLACEHOLDER ? unsubscribeUrl : escapeHtml(unsubscribeUrl)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${escapeHtml(draft.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${GROUND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${GROUND};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="padding:0 0 8px;text-align:center;">
    <a href="${escapeHtml(APP_URLS.frontendUrl('/'))}" style="font-family:${SERIF};font-size:30px;font-weight:600;letter-spacing:0.02em;color:${INK};text-decoration:none;">Questurian</a>
  </td></tr>
  <tr><td style="padding:0 0 28px;text-align:center;font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};border-bottom:3px double ${INK};">
    The Questurian newsletter · ${escapeHtml(month)}
  </td></tr>
  <tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>
  ${note}
  ${sectionLabel('New on Questurian')}
  ${items.map(itemHtml).join('')}
  <tr><td style="padding:24px;background-color:${PAPER};font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">
    You are getting this because you signed up for the Questurian newsletter at
    <a href="${escapeHtml(APP_URLS.frontendUrl('/'))}" style="color:${MUTED};">questurian.com</a>.<br>
    <a href="${unsubscribe}" style="color:${ACCENT};">Unsubscribe</a><br>
    ${escapeHtml(postalAddress)}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { html, text: htmlToText(html.replace(/<div style="display:none[^>]*>[\s\S]*?<\/div>/, '')) }
}
