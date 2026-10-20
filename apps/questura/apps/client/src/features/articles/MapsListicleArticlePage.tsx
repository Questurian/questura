import { Fragment, type JSX, type ReactNode } from 'react'
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
import { NewsletterArticleBand } from '@/features/newsletter/components/NewsletterArticleBand'
import { PaywallFade } from '@/features/articles/components/PaywallFade'
import type { MapsListicleArticle } from '@/features/articles/types/mapsListicle'

type MapsListicleArticlePageProps = {
  article: MapsListicleArticle
  /** Moment headings rendered on the server, keyed by the run they open. */
  momentHeadings?: ListicleMomentHeadings
  /**
   * What stands after the last place on a locked list: the paywall notice, or
   * the loading and error states while a member's full list is fetched.
   */
  lockedSlot?: ReactNode
  /**
   * True while `lockedSlot` is the paywall notice. With no place let through,
   * the notice follows the intro directly and the intro carries the fade, as
   * on a locked itinerary.
   */
  paywalled?: boolean
}

const NO_MOMENT_HEADINGS: ListicleMomentHeadings = {}

export function MapsListicleArticlePage({
  article,
  momentHeadings = NO_MOMENT_HEADINGS,
  lockedSlot = null,
  paywalled = false,
}: MapsListicleArticlePageProps): JSX.Element {
  const featuredImage = article.header?.featuredImage
  const introRaw = article.header?.intro
  const introHtml = typeof introRaw === 'string' ? introRaw : null
  const description = article.seoSection?.metaDescription

  const items = article.items ?? []
  // Nothing but the header and intro: the list, its separator and the space
  // they keep are dropped so the notice meets the intro's fade.
  const headerOnly = paywalled && items.length === 0
  const runs = groupListicleItemsByMoment(items)
  const isGrouped = runs.some((run) => momentHeadings[run.start] !== undefined)
  const ads = planListicleAds(items.length, {
    enabled: ADS_ENABLED,
    hasIntro: Boolean(introHtml),
  })

  return (
    <article data-listicle-type="maps" className="maps-listicle-article min-h-screen bg-background sm:max-w-[600px] sm:mx-auto">
      <ArticlePageHeader
        title={article.title}
        description={description}
        featuredImage={
          featuredImage?.url
            ? { ...featuredImage, url: featuredImage.url, alt: featuredImage.alt_text }
            : null
        }
        publishedAt={article.publishedAt}
        updatedAt={article.updatedAt}
        author={article.author}
        bookmark={{ targetType: 'maps', targetId: article.id }}
      />

      {introHtml ? (
        <div className="maps-listicle-intro-wrap relative px-3 pt-6 pb-2 380:px-4 380:pt-8 380:pb-3 480:px-5 480:pt-10 480:pb-4 550:px-6 sm:px-8 sm:pt-10 sm:pb-5">
          <div
            className="article-prose maps-listicle-intro max-w-none"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
          {/* Bounded by the intro, so a short one cannot push the fade up
              onto the header's share and bookmark controls. */}
          {headerOnly ? (
            <PaywallFade className="bottom-0 h-full max-h-56 sm:max-h-72" />
          ) : null}
        </div>
      ) : null}

      {ads.afterIntro ? (
        <div className="px-3 pt-4 380:px-4 480:px-5 550:px-6 sm:px-8">
          <InArticleAd slotId="listicle-intro" variant="rectangle" />
        </div>
      ) : null}

      {headerOnly ? null : <ListicleSeparator />}

      {headerOnly ? (
        <div className="px-3 pb-20 380:px-4 480:px-5 480:pb-24 550:px-6 sm:px-8 sm:pb-32">
          {/* Empty, but the phone map reads where the list ends from it, as on
              a locked itinerary. */}
          <ListicleMapRegion>{null}</ListicleMapRegion>
          {lockedSlot}
        </div>
      ) : (
        <div className="maps-listicle-entries px-3 pb-20 pt-4 380:px-4 380:pt-6 480:px-5 480:pt-8 480:pb-24 550:px-6 550:pt-10 sm:px-8 sm:pt-8 sm:pb-32">
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
                  className={runIndex > 0 ? 'pt-12 480:pt-14 sm:pt-16' : undefined}
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
          {lockedSlot ? <div className="pt-10 480:pt-12 sm:pt-14">{lockedSlot}</div> : null}
        </div>
      )}

      {/* Locked at desktop, the column ends with the notice, level with the
          map beside it (ListicleArticleLayout). */}
      <div className={`px-3 pt-14 pb-12 380:px-4 480:px-5 480:pt-16 550:px-6 sm:px-8 sm:pt-20${paywalled ? ' 1024:hidden' : ''}`}>
        <NewsletterArticleBand />
      </div>
    </article>
  )
}
