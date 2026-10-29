'use client'

import { GatedBodySkeleton, GatedLoadError } from '@/features/articles/components/GatedStates'
import { PaywallNotice } from '@/features/articles/components/PaywallNotice'
import type { GateState } from '@/features/articles/lib/gate'
import { useGatedFullArticle } from '@/features/articles/lib/useGatedFullArticle'
import type { ContentBlock, TableOfContentsEntry } from '@/features/articles/types'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'

/**
 * The member's body and everything that draws it: every block renderer, the
 * ad plan, the stay boxes. Its own chunk, because the article routes sit at
 * the first-load JavaScript cap (perf/budgets.json) and only a member who
 * opens a locked article needs that code in the browser. It starts loading as
 * soon as the reader is known to be a member, alongside the body itself.
 */
const loadMemberBody = () => import('@/features/articles/components/MemberArticleBody')
const MemberArticleBody = lazy(() =>
  loadMemberBody().then((module) => ({ default: module.MemberArticleBody })),
)

type GatedArticleBodyProps = {
  articleId: number
  gate: GateState
  /** Path the reader is on, so checkout can return them to it. */
  path: string
  lang?: string
  /** The Free sample, rendered on the server. A member's full body replaces it. */
  sample: ReactNode
  /** The Contents box's lines, drawn again in a member's full body. */
  contents?: TableOfContentsEntry[]
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
export function GatedArticleBody({ articleId, gate, path, lang, sample, contents }: GatedArticleBodyProps) {
  const { phase, data, retry } = useGatedFullArticle<FullArticleResponse>({
    articleId,
    type: 'articles',
    enabled: true,
    lang,
  })

  useEffect(() => {
    if (phase === 'loading') void loadMemberBody()
  }, [phase])

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

  // Until its code is in, the member sees what the loading phase showed.
  return (
    <Suspense
      fallback={
        <>
          {sample}
          <GatedBodySkeleton />
        </>
      }
    >
      <MemberArticleBody blocks={data.contentBlocks} contents={contents} />
    </Suspense>
  )
}
