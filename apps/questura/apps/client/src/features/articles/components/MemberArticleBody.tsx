import { useEffect } from 'react'
import { ArticleBlockStream } from '@/features/articles/components/ArticleBlockStream'
import { planArticleAds } from '@/features/articles/lib/adPlacement'
import { ADS_ENABLED } from '@/features/articles/lib/ads'
import { pairStayBoxes } from '@/features/articles/lib/stayBoxes'
import type { ContentBlock, TableOfContentsEntry } from '@/features/articles/types'
import { withAudioSlots, type ArticleAudio } from '@/features/audio/lib/slots'

/**
 * A member's whole body of a locked article, drawn in the browser once
 * `GatedArticleBody` has fetched it. Loaded on its own (see there), so the
 * block renderers stay out of every article page's first-load JavaScript.
 */
export function MemberArticleBody({
  blocks,
  contents,
  audio,
}: {
  blocks: ContentBlock[]
  contents?: TableOfContentsEntry[]
  audio?: ArticleAudio | null
}) {
  // A section link (`…#staying-safe`) to a locked part had nothing to land on
  // when the page loaded; the section exists now, so go to it.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [])

  // A member reads no seam, so the plan is the whole body's, as on a free
  // article, and the Airbnbs are boxed with their sections first, as there.
  const paired = withAudioSlots(pairStayBoxes(blocks), audio)
  const adPlan = planArticleAds(paired, { enabled: ADS_ENABLED })
  return <ArticleBlockStream blocks={paired} plan={adPlan} contents={contents} />
}
