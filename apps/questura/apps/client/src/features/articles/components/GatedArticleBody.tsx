'use client'

import { ArticleBlockStream } from '@/features/articles/components/ArticleBlockStream'
import { GatedBodySkeleton, GatedLoadError } from '@/features/articles/components/GatedStates'
import { PaywallNotice } from '@/features/articles/components/PaywallNotice'
import { planArticleAds } from '@/features/articles/lib/adPlacement'
import { ADS_ENABLED } from '@/features/articles/lib/ads'
import type { GateState } from '@/features/articles/lib/gate'
import { useGatedFullArticle } from '@/features/articles/lib/useGatedFullArticle'
import type { ContentBlock } from '@/features/articles/types'
import type { ReactNode } from 'react'

type GatedArticleBodyProps = {
  articleId: number
  gate: GateState
  /** Path the reader is on, so checkout can return them to it. */
  path: string
  lang?: string
  /** The Free sample, rendered on the server. A member's full body replaces it. */
  sample: ReactNode
}

type FullArticleResponse = {
  contentBlocks?: ContentBlock[]
}

/**
 * The body of a gated standard article: the Free sample and what follows it.
 *
 * Client-side because the cached public shell is `force-static`, where
 * `cookies()` is empty by construction -- no page under it can know who is
 * reading (ADR-0009).
 *
 * A member's full body replaces the sample rather than continuing it. The
 * sample is not a prefix of the body: it skips the blocks held back between
 * its paragraphs (an image, a key takeaway), so cutting the first `shown`
 * blocks off the body repeated a paragraph and lost those blocks.
 */
export function GatedArticleBody({ articleId, gate, path, lang, sample }: GatedArticleBodyProps) {
  const { phase, data, retry } = useGatedFullArticle<FullArticleResponse>({
    articleId,
    type: 'articles',
    enabled: true,
    lang,
  })

  // The notice is what the server renders and what the browser renders first,
  // so the two agree and hydration is stable. A member sees it briefly before
  // the swap; that is the correct trade, because the alternative puts a
  // loading placeholder in the cached HTML where a crawler and any reader
  // without JS would find the call to action -- and the paywall class, which
  // the page's paywall JSON-LD points at, lives on this notice.
  // Fragments, not wrappers: the article's `space-y-*` spaces these blocks.
  if (phase === 'identifying' || phase === 'anonymous') {
    return (
      <>
        {sample}
        <PaywallNotice gate={gate} returnTo={path} />
      </>
    )
  }

  if (phase === 'unverified') {
    return (
      <>
        {sample}
        <GatedLoadError onRetry={retry} reason="access" />
      </>
    )
  }

  if (phase === 'loading') {
    return (
      <>
        {sample}
        <GatedBodySkeleton />
      </>
    )
  }

  if (phase === 'failed' || !data?.contentBlocks) {
    return (
      <>
        {sample}
        <GatedLoadError onRetry={retry} />
      </>
    )
  }

  // A member reads no seam, so the plan is the whole body's, as on a free article.
  const adPlan = planArticleAds(data.contentBlocks, { enabled: ADS_ENABLED })
  return <ArticleBlockStream blocks={data.contentBlocks} plan={adPlan} />
}
