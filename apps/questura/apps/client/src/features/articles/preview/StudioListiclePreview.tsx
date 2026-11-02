'use client'

import { useMemo, type JSX } from 'react'
import { MapsPageHeader } from '@/features/articles/components/MapsPageHeader'
import { MapsArticleLayout } from '@/features/articles/layouts/MapsArticleLayout'
import { groupListicleItemsByMoment, listicleMomentHeadingId } from '@/features/articles/lib/listicleMomentGroups'
import {
  StudioPreviewWaiting,
  studioPreviewPlace,
  useStudioPreviewMessages,
} from '@/features/articles/preview/useStudioPreviewMessages'
import { isMapsListicleArticle } from '@/features/articles/types/mapsListicle'

/** The real single-type listicle page, drawn from whatever the AI Blog Writer posts in. */
export function StudioListiclePreview({
  headingsByMoment,
}: {
  headingsByMoment: Readonly<Record<string, JSX.Element>>
}): JSX.Element {
  const { article } = useStudioPreviewMessages(isMapsListicleArticle)

  const momentHeadings = useMemo(() => {
    const headings: Record<number, JSX.Element> = {}
    for (const run of groupListicleItemsByMoment(article?.items ?? [])) {
      const heading = run.moment ? headingsByMoment[run.moment] : undefined
      if (heading) headings[run.start] = <div id={listicleMomentHeadingId(run.start)}>{heading}</div>
    }
    return headings
  }, [article, headingsByMoment])

  if (!article) return <StudioPreviewWaiting />

  const { country, city } = studioPreviewPlace(article)

  return (
    <MapsArticleLayout
      article={article}
      header={<MapsPageHeader article={article} bookmark={null} />}
      momentHeadings={momentHeadings}
      relatedArticles={[]}
      country={country}
      city={city}
      gate={null}
    />
  )
}
