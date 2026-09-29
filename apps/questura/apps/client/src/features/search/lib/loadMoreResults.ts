'use server'

import {
  fetchLocationContent,
  isSearchUnavailable,
  searchArticles,
  type LocationContentItem,
} from '@/features/search/lib/fetchSearch'

/** What the search page is listing: a typed query or one location's content. */
export type ResultSource = { kind: 'query'; q: string } | { kind: 'location'; key: string }

export type MoreResults = { items: LocationContentItem[]; hasNext: boolean } | { failed: true }

/**
 * The next page of the search page's list, for the browser to append as the
 * reader scrolls. It runs on the frontend server so the backend call carries
 * the render token, exactly like the page's own first page.
 */
export async function loadMoreResults(source: ResultSource, page: number): Promise<MoreResults> {
  if (!Number.isInteger(page) || page < 2) return { failed: true }

  if (source.kind === 'query') {
    const answer = await searchArticles(String(source.q), page)
    if (!answer || isSearchUnavailable(answer)) return { failed: true }
    return { items: answer.items, hasNext: answer.hasNext }
  }

  const content = await fetchLocationContent(String(source.key), page).catch(() => null)
  if (!content) return { failed: true }
  return { items: content.items, hasNext: content.hasNext }
}
