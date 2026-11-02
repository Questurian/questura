'use client'

import { useEffect, useState, type JSX } from 'react'

type StudioMessage = {
  type: 'studio-preview:article'
  article?: unknown
  dayIndex?: number
}

/**
 * What the AI Blog Writer has posted in. The preview pages hold no draft of
 * their own and fetch nothing; the studio asks the API for the article and
 * sends the answer. Blurbs arrive as HTML, so only the parent frame is listened
 * to: this page's `frame-ancestors` lets only the studio be that parent
 * (STUDIO_PREVIEW_HEADERS). The studio's address cannot be written here, because
 * the build refuses a localhost address in browser code (scan-client-bundle.mjs).
 */
export function useStudioPreviewMessages<T>(isArticle: (doc: unknown) => doc is T): {
  article: T | null
  dayIndex: number | undefined
} {
  const [article, setArticle] = useState<T | null>(null)
  const [dayIndex, setDayIndex] = useState<number | undefined>(undefined)

  useEffect(() => {
    function onMessage(event: MessageEvent<StudioMessage>) {
      if (event.source !== window.parent) return
      if (event.data?.type !== 'studio-preview:article') return
      if (isArticle(event.data.article)) setArticle(event.data.article)
      if (typeof event.data.dayIndex === 'number') setDayIndex(event.data.dayIndex)
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'studio-preview:ready' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [isArticle])

  return { article, dayIndex }
}

export function StudioPreviewWaiting(): JSX.Element {
  return <p className="p-8 text-center text-sm text-muted-foreground">Waiting for the draft…</p>
}

export function studioPreviewPlace(article: object): { country: string; city: string | null } {
  const location = (article as { location?: unknown }).location
  const [country = '', city = null] = typeof location === 'string' ? location.split('|') : []
  return { country, city }
}
