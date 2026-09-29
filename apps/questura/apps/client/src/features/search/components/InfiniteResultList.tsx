'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ContentRow } from '@/features/search/components/LocationContentList'
import type { LocationContentItem } from '@/features/search/lib/fetchSearch'
import { loadMoreResults, type ResultSource } from '@/features/search/lib/loadMoreResults'

/**
 * How far below the screen the next page starts loading. About ten rows, so
 * a reader scrolling at a normal pace reaches the end of the list only after
 * the next page is already in it.
 */
const PREFETCH_DISTANCE = '0px 0px 1500px 0px'

type Props = {
  source: ResultSource
  initialItems: LocationContentItem[]
  initialPage: number
  initialHasNext: boolean
}

const itemKey = (item: LocationContentItem) => `${item.type}-${item.id}`

/**
 * The search page's result list. The server renders the first page; the next
 * one is fetched once the end of the list comes within PREFETCH_DISTANCE of
 * the screen, and appended.
 */
export function InfiniteResultList({ source, initialItems, initialPage, initialHasNext }: Props) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [hasNext, setHasNext] = useState(initialHasNext)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadNext = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setFailed(false)
    try {
      const result = await loadMoreResults(source, page + 1)
      if ('failed' in result) {
        setFailed(true)
        return
      }
      setItems((current) => {
        const seen = new Set(current.map(itemKey))
        return [...current, ...result.items.filter((item) => !seen.has(itemKey(item)))]
      })
      setPage(page + 1)
      setHasNext(result.hasNext && result.items.length > 0)
    } catch {
      setFailed(true)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [source, page])

  // A fresh observer after every page: its first report says whether the end
  // is still within reach (a tall screen after a short page), which an
  // existing observer would not repeat.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNext || failed) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNext()
      },
      { rootMargin: PREFETCH_DISTANCE },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNext, failed, loadNext])

  return (
    <div>
      <ul>
        {items.map((item) => (
          <ContentRow key={itemKey(item)} item={item} />
        ))}
      </ul>

      <div ref={sentinelRef} aria-hidden />

      {loading && (
        <p role="status" className="py-6 text-center text-[14px] text-foreground/55">
          Loading more…
        </p>
      )}
      {failed && (
        <p className="py-6 text-center text-[14px] text-foreground/60">
          Couldn&rsquo;t load more results.{' '}
          <button
            type="button"
            onClick={() => void loadNext()}
            className="text-accent underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      )}
    </div>
  )
}
