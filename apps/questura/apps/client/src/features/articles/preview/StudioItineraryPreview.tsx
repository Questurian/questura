'use client'

import { useEffect, useState, type JSX } from 'react'
import { ArticleAuthorBanner } from '@/features/articles/components/ArticleAuthorBanner'
import { ItineraryPageHeader } from '@/features/articles/components/ItineraryPageHeader'
import { ItineraryArticleLayout } from '@/features/articles/layouts/ItineraryArticleLayout'
import {
  isListicleItineraryArticle,
  type ListicleItineraryArticle,
} from '@/features/articles/types/itineraryListicle'

type StudioMessage = {
  type: 'studio-preview:article'
  article?: unknown
  dayIndex?: number
}

function parseCountryCity(location: unknown): { country: string; city: string | null } {
  const [country = '', city = null] = typeof location === 'string' ? location.split('|') : []
  return { country, city }
}

/**
 * The real itinerary page, drawn from whatever the AI Blog Writer posts in. The
 * page holds no draft of its own and fetches nothing; the studio asks the API
 * for the article and sends the answer. Blurbs arrive as HTML, so only the
 * parent frame is listened to: this page's `frame-ancestors` lets only the
 * studio be that parent (STUDIO_PREVIEW_HEADERS). The studio's address cannot
 * be written here, because the build refuses a localhost address in browser
 * code (scan-client-bundle.mjs).
 */
export function StudioItineraryPreview(): JSX.Element {
  const [article, setArticle] = useState<ListicleItineraryArticle | null>(null)
  const [dayIndex, setDayIndex] = useState<number | undefined>(undefined)

  useEffect(() => {
    function onMessage(event: MessageEvent<StudioMessage>) {
      if (event.source !== window.parent) return
      if (event.data?.type !== 'studio-preview:article') return
      if (isListicleItineraryArticle(event.data.article)) setArticle(event.data.article)
      if (typeof event.data.dayIndex === 'number') setDayIndex(event.data.dayIndex)
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'studio-preview:ready' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!article) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Waiting for the draft…</p>
  }

  const { country, city } = parseCountryCity((article as { location?: unknown }).location)

  return (
    <ItineraryArticleLayout
      article={article}
      authorBanner={article.author ? <ArticleAuthorBanner author={article.author} /> : null}
      header={<ItineraryPageHeader article={article} bookmark={null} />}
      relatedArticles={[]}
      country={country}
      city={city}
      gate={null}
      followDayIndex={dayIndex}
    />
  )
}
