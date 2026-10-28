import { ExternalLink } from 'lucide-react'

import Link from '@/components/navigation/PublicLink'

import type {
  EditorialFeatureBlock,
  FeaturedArticleTeaser,
  HomepageBlockLayoutProps,
} from '../../../types'
import { BlockSection } from '../BlockSection'
import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import { BLOCK_IMAGE_SIZES } from '../blockImageSizes'
import { PHONE_SQUARE_MEDIA } from '../PhoneSquareImage'
import { heroImagePriority } from '../heroImagePriority'
import { BLOCK_TYPE } from '../blockType'
import CountryFlag from '@/components/shared/ui/CountryFlag'
import { ArticleKickerLabel } from '../ArticleKickerLabel'
import { CardDek } from '../CardDek'

const FLAG_COUNTRY_NAMES = { PE: 'Peru', CO: 'Colombia', MX: 'Mexico' } as const

/**
 * Colours for the two panel themes. `dark` inverts onto the ink band the
 * article header uses (`bg-foreground`, warm type, `accent-soft` labels).
 */
const TONES = {
  light: {
    band: 'bg-background py-8',
    kicker: '',
    title: 'text-foreground',
    description: 'text-foreground/80',
    railRule: 'border-foreground/70',
    itemRule: 'border-foreground/25',
    itemTitle: '',
    itemDek: '',
    imageGround: 'bg-paper',
    flagRing: 'ring-foreground/15',
    focus: 'focus-visible:ring-accent',
    titleLink: 'decoration-current',
  },
  dark: {
    band: 'bg-foreground py-10 768:py-12',
    kicker: 'text-accent-soft',
    title: 'text-background',
    description: 'text-background/75',
    railRule: 'border-background/50',
    itemRule: 'border-background/20',
    itemTitle: 'text-background',
    itemDek: 'text-background/70',
    imageGround: 'bg-white/5',
    flagRing: 'ring-background/25',
    focus: 'focus-visible:ring-accent-soft',
    titleLink: 'decoration-current',
  },
} as const

type Tone = (typeof TONES)[keyof typeof TONES]

function Linked({ href, className, children }: {
  href: string | null
  className?: string
  children: React.ReactNode
}) {
  return href ? <Link href={href} className={className}>{children}</Link> : <>{children}</>
}

function ArticleImage({ article, square, tone }: {
  article: FeaturedArticleTeaser
  square: boolean
  tone: Tone
}) {
  const src = square
    ? article.imageUrlSquare ?? article.imageUrl
    : article.imageWide?.url ?? article.imageUrl ?? article.imageUrlSquare
  if (!src) return null
  const alt = square
    ? article.imageSquare?.alt ?? article.image?.alt ?? ''
    : article.imageWide?.alt ?? article.image?.alt ?? article.imageSquare?.alt ?? ''

  // Wide frames still show the square crop on phones (PHONE SQUARE RULE).
  const phoneSrc = square ? null : article.imageUrlSquare ?? null
  const img = (
    <PublicImage src={phoneSrc ?? src} alt={alt ?? ''} loading="lazy" decoding="async"
      className="h-full w-full object-cover transition-opacity duration-200 group-hover/image:opacity-85"
      sizes={BLOCK_IMAGE_SIZES.sideThumbnail}
    />
  )
  const image = phoneSrc && phoneSrc !== src ? (
    <picture className="block h-full w-full">
      <PublicSource media={PHONE_SQUARE_MEDIA} src={src} sizes={BLOCK_IMAGE_SIZES.sideThumbnail} />
      {img}
    </picture>
  ) : img
  return article.articlePath ? (
    <Link href={article.articlePath}
      className={`group/image block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.focus} ${tone === TONES.dark ? 'focus-visible:ring-offset-foreground' : 'focus-visible:ring-offset-background'}`}>
      {image}
    </Link>
  ) : image
}

function RelatedArticle({ article, count, index, tone }: {
  article: FeaturedArticleTeaser
  count: EditorialFeatureBlock['totalSlots']
  index: number
  tone: Tone
}) {
  const showImage = count !== 6
  const square = count === 2 || count === 3
  const imageColumn = count === 2
    ? '1024:grid-cols-[minmax(120px,48%)_1fr]'
    : '1024:grid-cols-[minmax(96px,38%)_1fr]'

  return (
    <article className={`grid min-w-0 gap-3 ${tone.itemRule} pb-4 1024:border-b 1024:last:border-b-0 ${showImage ? imageColumn : 'grid-cols-[2rem_1fr]'}`}>
      {showImage ? (
        <div className={`aspect-square overflow-hidden ${tone.imageGround} ${square ? '' : '768:aspect-[16/10]'}`}>
          <ArticleImage article={article} square={square} tone={tone} />
        </div>
      ) : (
        <span aria-hidden="true" className={`pt-0.5 tabular-nums ${tone.kicker} ${BLOCK_TYPE.kicker}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
      <div className="min-w-0 self-start">
        <p className={`mb-1 ${tone.kicker} ${BLOCK_TYPE.kicker}`}>
          <Linked
            href={article.articlePath}
            className={`outline-none focus-visible:ring-2 ${tone.focus}`}
          >
            <ArticleKickerLabel label={article.category?.name ?? article.articleType ?? 'Article'} />
          </Linked>
        </p>
        <h3 className={`${tone.itemTitle} ${BLOCK_TYPE.titleM}`}>
          <Linked href={article.articlePath} className={`outline-none focus-visible:ring-2 ${tone.focus}`}>
            {article.title}
          </Linked>
        </h3>
        <CardDek excerpt={article.excerpt} href={article.articlePath} className={`mt-1.5 ${tone.itemDek}`} />
      </div>
    </article>
  )
}

export function EditorialFeaturePreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<EditorialFeatureBlock>) {
  const imagePriority = heroImagePriority(blockIndex)
  const featureHref = block.linkedLocation?.href ?? null
  const portrait = block.featureImagePortrait ?? block.featureImageWide
  const wide = block.featureImageWide ?? block.featureImagePortrait
  // The <img> fallback inside <picture> needs a src that exists. `wide ??
  // portrait` would keep a `wide` entry whose url is missing and render none.
  const fallbackImage = wide?.url ? wide : portrait
  const tone = block.featureTheme === 'dark' ? TONES.dark : TONES.light
  const flag = block.featureFlag ?? null

  return (
    <BlockSection
      aria-label={block.featureTitle ?? 'Featured destination'}
      className={tone.band}
      band={tone === TONES.dark}
      data-feature-theme={block.featureTheme === 'dark' ? 'dark' : 'light'}
    >
      <div className="grid gap-8 768:grid-cols-[minmax(230px,0.82fr)_1.18fr] 768:items-stretch 1024:grid-cols-[minmax(260px,0.9fr)_minmax(280px,0.9fr)_minmax(330px,1.1fr)] 1024:gap-10">
        {/* 768+: fill the track and the stretched row. A fixed 4:5 ratio on a
            stretched row made the image wider than its track, over the copy. */}
        <div className={`aspect-[16/10] min-w-0 overflow-hidden ${tone.imageGround} 768:aspect-auto 768:min-h-[22rem]`}>
          {fallbackImage?.url ? (
            <Linked href={featureHref}
              className={`group/image block h-full outline-none focus-visible:ring-2 focus-visible:ring-inset ${tone.focus}`}>
              <picture className="block h-full w-full">
                {portrait?.url ? <PublicSource media="(min-width: 768px)" src={portrait.url} sizes={BLOCK_IMAGE_SIZES.featureImage} /> : null}
                <PublicImage
                  src={fallbackImage.url}
                  alt={fallbackImage.alt ?? ''}
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover/image:opacity-85"
                  {...imagePriority}
                  sizes={BLOCK_IMAGE_SIZES.featureImage}
                />
              </picture>
            </Linked>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col justify-center py-8 text-center 768:px-5 1024:px-0">
          {flag ? (
            <CountryFlag
              code={flag}
              countryName={FLAG_COUNTRY_NAMES[flag]}
              className={`mx-auto mb-5 h-6 w-9 ring-1 ${tone.flagRing}`}
            />
          ) : null}
          {block.featureKicker ? (
            <p className={`mb-4 ${tone.kicker} ${BLOCK_TYPE.kicker}`}>
              <Linked href={featureHref} className={`outline-none focus-visible:ring-2 ${tone.focus}`}>
                {block.featureKicker}
              </Linked>
            </p>
          ) : null}
          {block.featureTitle ? (
            <h2 className={`font-display text-[2.65rem] font-medium leading-[0.95] ${tone.title} 768:text-[3.35rem]`}>
              {featureHref ? (
                // The destination link is the block's main way into a city or
                // country page, so it reads as a link at rest: underlined,
                // with the external-link mark. Offset and thickness match the global
                // headline hover rule so hovering only changes the colour.
                <Link
                  href={featureHref}
                  className={`group/title underline decoration-from-font underline-offset-[0.14em] transition-colors outline-none focus-visible:ring-2 ${tone.titleLink} ${tone.focus}`}
                >
                  {block.featureTitle}
                  <ExternalLink
                    aria-hidden
                    strokeWidth={2}
                    // Same colour as the title (currentColor). Centred on the
                    // underlined word: halfway from the top of the capitals
                    // to the bottom of the underline.
                    className="relative -top-[0.025em] ml-[0.16em] inline-block size-[0.3em] align-middle"
                  />
                </Link>
              ) : (
                block.featureTitle
              )}
            </h2>
          ) : null}
          {block.featureDescription ? (
            <p className={`mx-auto mt-7 max-w-[38rem] font-editorial text-[1.05rem] leading-[1.55] ${tone.description}`}>
              <Linked href={featureHref} className={`outline-none hover:underline focus-visible:ring-2 ${tone.focus}`}>
                {block.featureDescription}
              </Linked>
            </p>
          ) : null}
        </div>

        <div className={`grid content-start gap-4 ${tone.railRule} 768:col-span-2 768:grid-cols-2 1024:col-span-1 1024:grid-cols-1 1024:border-l 1024:pl-6 ${block.totalSlots === 6 ? '1280:grid-cols-1' : ''}`}>
          {block.items.map((article, index) => (
            <RelatedArticle key={`${article.articlePath ?? article.title}:${index}`}
              article={article} count={block.totalSlots} index={index} tone={tone} />
          ))}
        </div>
      </div>
    </BlockSection>
  )
}
