import { Suspense } from 'react'
import Link from '@/components/navigation/PublicLink'
import { PublicImage } from '@/components/media/PublicImage'
import { AdLabel } from '@/features/ads/components/AdLabel'
import { AdSurface } from '@/features/ads/components/AdSurface'
import { isAdShapeOn, type AdShape } from '@/features/ads/lib/adUnits'
import type { ArticleIndexItem } from '@/features/articles/lib/fetchArticleIndex'
import type { ArticleSidebarLists } from '@/features/articles/lib/fetchArticleSidebar'

/**
 * The rail's two slots: the tall one (300x250 while the rail sits under the
 * article, the 160x600 skyscraper once it is a side column at 1024px) and a
 * 300x250 under it.
 */
const RAIL_SLOTS: readonly AdShape[] = ['rail', 'rectangle']

function AdSlot({ shape }: { shape: AdShape }) {
  return (
    <div data-ad-slot className="w-full">
      <AdLabel className="mb-1.5" />
      <AdSurface shape={shape} />
    </div>
  )
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="border-b border-foreground/20 pb-2 font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground"
    >
      {children}
    </h2>
  )
}

/**
 * Ad rail. The ads pin below the navbar and stay there for the whole read, so
 * the top ad is always in view. The trending list sits *outside* the sticky
 * box, in the column below it: that keeps it from pushing the ads off-screen
 * (a sticky box taller than the viewport can only ever show one of its ends)
 * and gives the ads a containing block that ends just above it, so they
 * release into the trending list at the bottom of the article instead of
 * overlapping it.
 */
export function ArticleRail({ trending }: { trending: ArticleIndexItem[] }) {
  const slots = RAIL_SLOTS.filter(isAdShapeOn)

  // With ads off, trending takes the pinned spot instead of hanging at the
  // bottom of an empty column.
  if (slots.length === 0) {
    return (
      <div data-article-sidebar className="1024:h-full">
        <div className="1024:sticky 1024:top-24">
          <ArticleTrending trending={trending} />
        </div>
      </div>
    )
  }

  return (
    <div data-article-sidebar className="1024:flex 1024:h-full 1024:flex-col">
      <div className="1024:flex-1">
        <div className="flex flex-col gap-8 1024:sticky 1024:top-24">
          {slots.map((shape) => (
            <AdSlot key={shape} shape={shape} />
          ))}
        </div>
      </div>

      <div className="mt-8 1024:mt-10">
        <ArticleTrending trending={trending} />
      </div>
    </div>
  )
}

function ArticleTrending({ trending }: { trending: ArticleIndexItem[] }) {
  if (trending.length === 0) return null

  return (
    <section aria-labelledby="article-trending-heading">
      <SectionHeading id="article-trending-heading">Trending News</SectionHeading>
      <ul className="divide-y divide-foreground/12">
        {trending.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="group flex gap-3 py-3">
              <div className="relative size-[72px] shrink-0 overflow-hidden bg-foreground/8">
                {item.thumbnail ? (
                  <PublicImage
                    src={item.thumbnail.url}
                    alt={item.thumbnail.alt ?? ''}
                    width={144}
                    height={144}
                    sizes="72px"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="min-w-0 font-display text-[15px] leading-snug text-foreground group-hover:underline">
                {item.title}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Full-width card row that closes the page. */
export function ArticlePartners({ partners }: { partners: ArticleIndexItem[] }) {
  if (partners.length === 0) return null

  return (
    <section aria-labelledby="article-partners-heading" className="pt-12 pb-16 1024:pt-16 1024:pb-20">
      <SectionHeading id="article-partners-heading">More from Questurian</SectionHeading>
      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
        {partners.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="group block">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-foreground/8">
                {item.thumbnail ? (
                  <PublicImage
                    src={item.thumbnail.url}
                    alt={item.thumbnail.alt ?? ''}
                    width={480}
                    height={360}
                    sizes="(min-width: 1024px) 210px, (min-width: 640px) 30vw, 45vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="mt-2.5 font-display text-[15px] leading-snug text-foreground group-hover:underline">
                {item.title}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/*
 * The recommendation lookups are secondary: the article must not wait for
 * them. Both placements read one shared promise, each behind its own boundary,
 * so the heading and body stream first and the lists fill in when they land.
 */

async function ResolvedRail({ sidebar }: { sidebar: Promise<ArticleSidebarLists> }) {
  const { trending } = await sidebar
  return <ArticleRail trending={trending} />
}

/** The rail holds its column while trending loads; no placeholder list. */
export function StreamedArticleRail({ sidebar }: { sidebar: Promise<ArticleSidebarLists> }) {
  return (
    <Suspense fallback={<ArticleRail trending={[]} />}>
      <ResolvedRail sidebar={sidebar} />
    </Suspense>
  )
}

async function ResolvedPartners({ sidebar }: { sidebar: Promise<ArticleSidebarLists> }) {
  const { partners } = await sidebar
  return <ArticlePartners partners={partners} />
}

export function StreamedArticlePartners({ sidebar }: { sidebar: Promise<ArticleSidebarLists> }) {
  return (
    <Suspense fallback={null}>
      <ResolvedPartners sidebar={sidebar} />
    </Suspense>
  )
}
