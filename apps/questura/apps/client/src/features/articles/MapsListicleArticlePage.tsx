import { Fragment, type JSX } from 'react'
import { ArticlePageHeader } from '@/features/articles/components/ArticlePageHeader'
import { ListicleMapRegion } from '@/features/articles/components/ListicleMapRegion'
import { ListicleSeparator } from '@/features/articles/components/ListicleSeparator'
import { ListicleAd } from '@/features/articles/components/ListicleAd'
import { ListicleVenueEntry } from '@/features/articles/components/ListicleVenueEntry'
import type { ListicleMomentHeadings } from '@/features/articles/components/ListicleMomentHeading'
import { InArticleAd } from '@/features/articles/components/InArticleAd'
import { planListicleAds } from '@/features/articles/lib/listicleAdPlacement'
import {
  groupListicleItemsByMoment,
  listicleMomentHeadingId,
} from '@/features/articles/lib/listicleMomentGroups'
import { ADS_ENABLED } from '@/features/articles/lib/ads'
import type { MapsListicleArticle } from '@/features/articles/types/mapsListicle'

type MapsListicleArticlePageProps = {
  article: MapsListicleArticle
  /** Moment headings rendered on the server, keyed by the run they open. */
  momentHeadings?: ListicleMomentHeadings
}

const NO_MOMENT_HEADINGS: ListicleMomentHeadings = {}

export function MapsListicleArticlePage({
  article,
  momentHeadings = NO_MOMENT_HEADINGS,
}: MapsListicleArticlePageProps): JSX.Element {
  const featuredImage = article.header?.featuredImage
  const introRaw = article.header?.intro
  const introHtml = typeof introRaw === 'string' ? introRaw : null
  const description = article.seoSection?.metaDescription

  const items = article.items ?? []
  const runs = groupListicleItemsByMoment(items)
  const isGrouped = runs.some((run) => momentHeadings[run.start] !== undefined)
  const ads = planListicleAds(items.length, {
    enabled: ADS_ENABLED,
    hasIntro: Boolean(introHtml),
  })

  return (
    <article className="maps-listicle-article min-h-screen bg-background sm:max-w-[600px] sm:mx-auto 1024:max-w-none 1024:mx-0">
      <ArticlePageHeader
        title={article.title}
        description={description}
        featuredImage={
          featuredImage?.url
            ? { url: featuredImage.url, alt: featuredImage.alt_text }
            : null
        }
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
        author={article.author}
        bookmark={{ targetType: 'maps', targetId: article.id }}
      />

      {introHtml ? (
        <div className="px-3 pt-6 pb-2 380:px-4 380:pt-8 380:pb-3 480:px-5 480:pt-10 480:pb-4 550:px-6 sm:px-8 sm:pt-10 sm:pb-5 768:px-10">
          <div
            className="article-prose maps-listicle-intro max-w-none"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        </div>
      ) : null}

      {ads.afterIntro ? (
        <div className="px-3 pt-4 380:px-4 480:px-5 550:px-6 sm:px-8 768:px-10">
          <InArticleAd slotId="listicle-intro" variant="rectangle" />
        </div>
      ) : null}

      <ListicleSeparator />

      <div className="px-3 pb-20 pt-4 380:px-4 380:pt-6 480:px-5 480:pt-8 480:pb-24 550:px-6 550:pt-10 sm:px-8 sm:pt-8 sm:pb-32 768:px-10">
        <ListicleMapRegion>
          {runs.map((run, runIndex) => {
            const heading = momentHeadings[run.start]
            const hasHeading = heading !== undefined
            const headingId = listicleMomentHeadingId(run.start)
            const list = (
              <ol start={run.start + 1} className="m-0 list-none p-0">
                {run.items.map((row, offset) => {
                  const i = run.start + offset
                  return (
                    <Fragment key={row.id}>
                      <ListicleVenueEntry
                        row={row}
                        index={i}
                        headingLevel={hasHeading ? 3 : 2}
                      />
                      {ads.afterItem.has(i) ? <ListicleAd slotId={`listicle-${i}`} /> : null}
                    </Fragment>
                  )
                })}
              </ol>
            )
            if (!isGrouped) return <Fragment key={run.start}>{list}</Fragment>

            // A run without a moment after a grouped one gets a bare hairline,
            // so its places do not read as part of the heading above.
            return (
              <section
                key={run.start}
                aria-labelledby={hasHeading ? headingId : undefined}
                className={runIndex > 0 ? 'pt-12 480:pt-14 sm:pt-16 768:pt-20' : undefined}
              >
                {hasHeading ? (
                  heading
                ) : runIndex > 0 ? (
                  <div aria-hidden="true" className="h-px bg-foreground/18" />
                ) : null}
                <div className={hasHeading || runIndex > 0 ? 'pt-6 480:pt-8 sm:pt-10' : undefined}>
                  {list}
                </div>
              </section>
            )
          })}
        </ListicleMapRegion>
      </div>
    </article>
  )
}
