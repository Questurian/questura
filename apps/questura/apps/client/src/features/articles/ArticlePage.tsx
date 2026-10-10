import Link from '@/components/navigation/PublicLink'
import { PublicImage } from '@/components/media/PublicImage'
import { GatedArticleBody } from '@/features/articles/components/GatedArticleBody'
import { ArticleShareButton } from '@/features/articles/components/ArticleShareButton'
import { AddOnGoogleButton } from '@/features/articles/components/AddOnGoogleButton'
import { BookmarkButton } from '@/features/bookmarks/components/BookmarkButton'
import { AuthorLink } from '@/features/authors/components/AuthorLink'
import {
  StreamedArticlePartners,
  StreamedArticleRail,
} from '@/features/articles/components/ArticleSidebar'
import { planArticleAds, type AdPlan } from '@/features/articles/lib/adPlacement'
import { ADS_ENABLED } from '@/features/articles/lib/ads'
import { readGate } from '@/features/articles/lib/gate'
import { articleCrumbsFromPath } from '@/features/articles/lib/articleCrumbs'
import { fetchStandardArticleSidebar } from '@/features/articles/lib/fetchArticleSidebar'
import { ArticleBlockStream } from '@/features/articles/components/ArticleBlockStream'
import { ArticleByline } from '@/features/articles/components/ArticleByline'
import { ArticleAuthorBanner } from '@/features/articles/components/ArticleAuthorBanner'
import { getPublicBaseUrl } from '@/lib/seo/publicBaseUrl'
import { Article, type ArticleDisplayLayout } from './types'
import { formatArticleDate } from '@/lib/dates'

/** Share, bookmark and "Add us on Google": the same row in every layout. */
function ArticleShareRow({
  article,
  shareUrl,
  align = 'start',
  tone = 'light',
}: {
  article: Article
  shareUrl: string
  align?: 'start' | 'center'
  tone?: 'light' | 'dark'
}) {
  const centered = align === 'center'
  return (
    <div className={`flex flex-col gap-4 ${centered ? 'items-center' : 'items-start'}`}>
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-3 ${centered ? 'justify-center' : ''} ${
          tone === 'dark' ? 'text-white [&_button]:text-white' : ''
        }`}
      >
        <ArticleShareButton
          url={shareUrl}
          title={article.title}
          imageUrl={article.headerSection?.featuredImage?.url}
        />
        <span
          aria-hidden="true"
          className={`size-[3px] rounded-full ${tone === 'dark' ? 'bg-white/40' : 'bg-foreground/30'}`}
        />
        <BookmarkButton targetType="articles" targetId={article.id} />
      </div>
      <AddOnGoogleButton />
    </div>
  )
}

/** The article's lead photo. Every layout shows the same image and caption. */
function ArticleHeroFigure({
  article,
  sizes,
  frameClassName,
  captionClassName,
}: {
  article: Article
  sizes: string
  frameClassName: string
  captionClassName: string
}) {
  const featuredImage = article.headerSection?.featuredImage
  if (!featuredImage?.url) return null

  return (
    <figure>
      <div className={`w-full overflow-hidden ${frameClassName}`}>
        <PublicImage
          src={featuredImage.url}
          alt={featuredImage.alt_text ?? ''}
          width={1600}
          height={1000}
          sizes={sizes}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      {featuredImage.alt_text ? (
        <figcaption className={captionClassName}>{featuredImage.alt_text}</figcaption>
      ) : null}
    </figure>
  )
}

/** Blocks, paywall and author banner: shared by every layout. */
function ArticleBody({ article, path, adPlan }: { article: Article; path?: string; adPlan: AdPlan }) {
  const gate = readGate(article)
  return (
    <div className="space-y-8 sm:space-y-10">
      <ArticleBlockStream blocks={article.contentBlocks ?? []} plan={adPlan} />

      {gate?.locked ? (
        <GatedArticleBody articleId={article.id} gate={gate} path={path ?? '/'} />
      ) : null}

      {article.author ? <ArticleAuthorBanner author={article.author} /> : null}
    </div>
  )
}

/** The category label above a centered title: the last breadcrumb, linked. */
function ArticleKicker({ path, className }: { path?: string; className: string }) {
  const crumb = articleCrumbsFromPath(path).at(-1)
  if (!crumb) return null
  return (
    <p
      className={`font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}
    >
      {crumb.href ? (
        <Link href={crumb.href} className="hover:underline">
          {crumb.label}
        </Link>
      ) : (
        crumb.label
      )}
    </p>
  )
}

function StandardArticleHeader({
  article,
  path,
  shareUrl,
}: {
  article: Article
  path?: string
  shareUrl: string
}) {
  const { title, author, publishedAt, updatedAt, seoSection } = article
  const description = seoSection?.metaDescription
  const dateLine = formatArticleDate(publishedAt ?? updatedAt, 'long')
  const crumbs = articleCrumbsFromPath(path)

  return (
    <header className="px-4 pt-8 pb-6 1024:px-0 1024:pt-10 1024:pb-8">
      <div className="mb-5 flex flex-col gap-2 1024:mb-6 1024:flex-row 1024:items-baseline 1024:justify-between 1024:gap-6">
        {crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-1.5 font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-x-1.5">
                  {index > 0 ? <span aria-hidden className="text-accent/60">›</span> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : (
          <span />
        )}
        {author ? (
          <ArticleByline author={author} dateLine={dateLine} variant="standard" />
        ) : dateLine ? (
          <p className="font-display text-[15px] italic leading-snug text-foreground 1024:text-right">
            {dateLine}
          </p>
        ) : null}
      </div>

      <h1 className="font-display text-[32px] font-normal leading-[1.08] text-foreground sm:text-[40px] 1024:text-[44px]">
        {title}
      </h1>

      {description ? (
        <>
          <div className="mt-5 h-px w-full bg-foreground/18" aria-hidden />
          <p className="mt-5 max-w-[40rem] font-display text-[18px] italic leading-[1.4] text-foreground/80 sm:text-[20px]">
            {description}
          </p>
        </>
      ) : (
        <div className="mt-5 h-px w-full bg-foreground/18" aria-hidden />
      )}

      <div className="mt-6">
        <ArticleShareRow article={article} shareUrl={shareUrl} />
      </div>
    </header>
  )
}

type LayoutProps = {
  article: Article
  path?: string
  shareUrl: string
  adPlan: AdPlan
  sidebar: ReturnType<typeof fetchStandardArticleSidebar>
}

/** Today's page: header and photo in the reading column, rail on the right. */
function ClassicArticleLayout({ article, path, shareUrl, adPlan, sidebar }: LayoutProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-0 1024:px-8">
      <div className="1024:grid 1024:grid-cols-[1fr_300px] 1024:gap-x-12">
        <div className="1024:col-start-1 1024:row-start-1">
          <StandardArticleHeader article={article} path={path} shareUrl={shareUrl} />
        </div>

        <div className="min-w-0 1024:col-start-1 1024:row-start-2">
          <ArticleHeroFigure
            article={article}
            sizes="(min-width: 1024px) 780px, 100vw"
            frameClassName="aspect-[16/10]"
            captionClassName="px-4 pt-2 font-mono text-[11px] text-foreground/45 1024:px-0"
          />

          <div className="px-4 pt-8 pb-16 1024:px-0 1024:pt-10 1024:pb-20">
            <ArticleBody article={article} path={path} adPlan={adPlan} />
          </div>
        </div>

        <div className="px-4 pt-10 1024:col-start-2 1024:row-start-2 1024:px-0 1024:pt-0">
          <StreamedArticleRail sidebar={sidebar} />
        </div>
      </div>

      <div className="px-4 1024:px-0">
        <StreamedArticlePartners sidebar={sidebar} />
      </div>
    </div>
  )
}

/**
 * IMG-2/3: an ink (#1A1A1A, `--foreground`) header band with the wide photo
 * and a centered title block, then the body and rail on the page ground,
 * exactly as in the classic layout.
 */
function DarkHeroArticleLayout({ article, path, shareUrl, adPlan, sidebar }: LayoutProps) {
  const { title, author, publishedAt, updatedAt, seoSection } = article
  const description = seoSection?.metaDescription
  const dateLine = formatArticleDate(publishedAt ?? updatedAt, 'long')

  return (
    <>
      <header className="bg-foreground text-white">
        <div className="mx-auto w-full max-w-6xl px-0 pt-0 pb-10 1024:px-8 1024:pt-10 1024:pb-14">
          <ArticleHeroFigure
            article={article}
            sizes="(min-width: 1152px) 1088px, (min-width: 1024px) calc(100vw - 64px), 100vw"
            frameClassName="aspect-[16/10] 768:aspect-[2/1]"
            captionClassName="px-4 pt-2 text-right font-mono text-[11px] text-white/50 1024:px-0"
          />

          <div className="mx-auto mt-8 flex max-w-[46rem] flex-col items-center px-4 text-center 1024:mt-12">
            <ArticleKicker path={path} className="text-accent-soft" />
            <h1 className="mt-4 font-display text-[34px] font-normal leading-[1.06] text-white sm:text-[44px] 1024:text-[54px]">
              {title}
            </h1>
            {description ? (
              <p className="mt-5 max-w-[38rem] font-display text-[18px] italic leading-[1.4] text-white/75 sm:text-[20px]">
                {description}
              </p>
            ) : null}
            {author ? (
              <p className="mt-7 font-[family-name:var(--font-dm-sans)] text-[12px] font-bold uppercase tracking-[0.14em] text-accent-soft">
                By{' '}
                <AuthorLink authorSlug={author.slug} authorId={author.id} className="hover:underline">
                  {author.displayName}
                </AuthorLink>
              </p>
            ) : null}
            {dateLine ? (
              <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {dateLine}
              </p>
            ) : null}
            <div className="mt-7">
              <ArticleShareRow article={article} shareUrl={shareUrl} align="center" tone="dark" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-0 1024:px-8">
        <div className="1024:grid 1024:grid-cols-[1fr_300px] 1024:gap-x-12">
          <div className="min-w-0 px-4 pt-10 pb-16 1024:px-0 1024:pt-12 1024:pb-20">
            <ArticleBody article={article} path={path} adPlan={adPlan} />
          </div>

          <div className="px-4 pt-10 1024:px-0 1024:pt-12">
            <StreamedArticleRail sidebar={sidebar} />
          </div>
        </div>

        <div className="px-4 1024:px-0">
          <StreamedArticlePartners sidebar={sidebar} />
        </div>
      </div>
    </>
  )
}

/**
 * IMG-4: everything on the page ground. Centered title block, a wide photo,
 * a date and share row over a hairline, one centered reading column with the
 * in-article ads widened into full-width bands, and the rail's content moved
 * below the article.
 */
function CenteredArticleLayout({ article, path, shareUrl, adPlan, sidebar }: LayoutProps) {
  const { title, author, publishedAt, updatedAt, seoSection } = article
  const description = seoSection?.metaDescription
  const dateLine = formatArticleDate(publishedAt ?? updatedAt, 'long')

  return (
    <div className="mx-auto w-full max-w-6xl px-0 1024:px-8">
      <header className="mx-auto flex max-w-[48rem] flex-col items-center px-4 pt-10 pb-8 text-center 1024:pt-14 1024:pb-10">
        <ArticleKicker path={path} className="text-accent" />
        <h1 className="mt-4 font-display text-[34px] font-normal leading-[1.06] text-foreground sm:text-[46px] 1024:text-[56px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-[38rem] font-display text-[18px] italic leading-[1.4] text-foreground/75 sm:text-[20px]">
            {description}
          </p>
        ) : null}
        {author ? (
          <p className="mt-6 font-display text-[16px] leading-snug text-foreground">
            By{' '}
            <AuthorLink authorSlug={author.slug} authorId={author.id} className="font-semibold hover:underline">
              {author.displayName}
            </AuthorLink>
          </p>
        ) : null}
      </header>

      <ArticleHeroFigure
        article={article}
        sizes="(min-width: 1152px) 1088px, (min-width: 1024px) calc(100vw - 64px), 100vw"
        frameClassName="aspect-[16/10] 768:aspect-[2/1]"
        captionClassName="px-4 pt-2 text-right font-mono text-[11px] text-foreground/45 1024:px-0"
      />

      <div className="mx-auto max-w-[42rem] px-4">
        <div className="flex flex-col gap-4 border-b border-foreground/18 py-6 480:flex-row 480:items-center 480:justify-between">
          {dateLine ? (
            <p className="font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">
              {dateLine}
            </p>
          ) : (
            <span />
          )}
          <ArticleShareRow article={article} shareUrl={shareUrl} />
        </div>

        <div className="pt-10 pb-16 [&_[data-in-article-ad]]:mx-[calc(50%-50vw)] [&_[data-in-article-ad]]:bg-paper [&_[data-in-article-ad]]:px-4 1024:pb-20">
          <ArticleBody article={article} path={path} adPlan={adPlan} />
        </div>

        <StreamedArticleRail sidebar={sidebar} />
      </div>

      <div className="px-4 1024:px-0">
        <StreamedArticlePartners sidebar={sidebar} />
      </div>
    </div>
  )
}

const LAYOUTS: Record<ArticleDisplayLayout, (props: LayoutProps) => React.JSX.Element> = {
  classic: ClassicArticleLayout,
  'dark-hero': DarkHeroArticleLayout,
  centered: CenteredArticleLayout,
}

export function ArticlePage({ article, path }: { article: Article; path?: string }) {
  const gate = readGate(article)
  const adPlan = planArticleAds(article.contentBlocks ?? [], {
    enabled: ADS_ENABLED,
    gateAt: gate?.locked ? gate.shown : null,
  })
  // Started here, awaited only inside the rail and footer boundaries.
  const sidebar = fetchStandardArticleSidebar(article, path)
  const sharePath = path && path.startsWith('/') ? path : `/${article.slug}`
  const shareUrl = `${getPublicBaseUrl()}${sharePath}`
  const displayLayout: ArticleDisplayLayout =
    article.displayLayout && article.displayLayout in LAYOUTS ? article.displayLayout : 'classic'
  const Layout = LAYOUTS[displayLayout]

  return (
    <article
      data-article-layout="standard"
      data-display-layout={displayLayout}
      className="min-h-screen bg-background"
    >
      <Layout article={article} path={path} shareUrl={shareUrl} adPlan={adPlan} sidebar={sidebar} />
    </article>
  )
}
