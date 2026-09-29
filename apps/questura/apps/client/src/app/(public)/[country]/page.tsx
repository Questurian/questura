import Link from '@/components/navigation/PublicLink'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { fetchCountryCities } from '@/features/CountryHub/lib/fetchCountryCities'
import { LocationComingSoon } from '@/features/search/components/LocationComingSoon'
import { LocationContentList } from '@/features/search/components/LocationContentList'
import { fetchLocationContent } from '@/features/search/lib/fetchSearch'
import { isLocationSlug } from '@/lib/routing/locationSlug'
import { countryParams } from '@/lib/routing/publicRouteParams'
import { publicUrlIndex } from '@/lib/routing/publicStaticParams'

const CONTENT_PAGE_SIZE = 50

const SECTION_LABEL =
  'mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55'

// Pre-rendered at build time so a first visitor — often the crawler — is
// served a cached page instead of paying a live render. dynamicParams stays at
// its default, so a country published after the last deploy still renders on
// demand. See src/lib/routing/publicStaticParams.ts.
export async function generateStaticParams() {
  const { pages } = await publicUrlIndex()
  return countryParams(pages)
}

type Props = {
  params: Promise<{ country: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params
  if (!isLocationSlug(country)) return {}
  const data = await fetchCountryCities(country)

  if (!data) return {}

  const countryName = data.country.name ?? data.country.slug

  return {
    title: `${countryName} City Guides - Questurian`,
    description: `Browse Questurian city guides for ${countryName}.`,
    alternates: { canonical: `/${data.country.slug}` },
    openGraph: {
      title: `${countryName} City Guides - Questurian`,
      url: `/${data.country.slug}`,
    },
  }
}

export default async function CountryHubPage({ params }: Props) {
  const { country } = await params
  // `/evil.com`, `/foo.bar`: not a location slug, so not a page. Asking the
  // backend anyway got a 400 back and rendered a 500 (lib/routing/locationSlug.ts).
  if (!isLocationSlug(country)) notFound()
  // 'public-page' keeps this list on the same hour-long revalidate as
  // fetchCountryCities. The fetcher's default is search's five minutes, and
  // because Next takes the shortest revalidate in a render, that default was
  // capping this whole route at five minutes too.
  const [data, content] = await Promise.all([
    fetchCountryCities(country),
    fetchLocationContent(country, 1, undefined, CONTENT_PAGE_SIZE, 'public-page'),
  ])

  if (!data && !content) {
    notFound()
  }

  const countryName = data?.country.name ?? content?.location.label ?? country
  const cities = data?.cities ?? []

  return (
    <section className="min-h-[70vh] bg-background px-5 py-16 text-foreground 768:px-10 1024:px-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[48px] font-medium leading-[0.95] text-foreground 480:text-[64px] 768:text-[84px]">
          {countryName}
        </h1>

        {/* One column, cities first: a grid of city cards reads the same with
            one city as with several, where the old right-hand list left a
            lone row floating beside the heading. */}
        {cities.length > 0 && (
          <nav aria-label={`Cities in ${countryName}`} className="mt-12">
            <p className={SECTION_LABEL}>{cities.length === 1 ? 'City' : 'Cities'}</p>
            <ul className="grid gap-3 480:grid-cols-2 768:grid-cols-3">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={city.href}
                    className="group flex h-full items-center justify-between gap-4 rounded-lg border border-foreground/15 px-5 py-4 outline-none transition-colors hover:border-foreground/35 hover:bg-foreground/[0.03] focus-visible:border-foreground/50"
                  >
                    <span className="min-w-0 break-words font-display text-[24px] leading-tight text-foreground">
                      {city.name ?? city.slug}
                    </span>
                    <ArrowUpRight
                      className="size-5 shrink-0 text-foreground/45 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-14">
          {content && content.items.length > 0 ? (
            <>
              <p className={SECTION_LABEL}>Latest from {countryName}</p>
              <LocationContentList
                content={content}
                pageHref={(page) =>
                  `/search?location=${encodeURIComponent(content.location.locationKey)}&page=${page}`
                }
              />
            </>
          ) : (
            <LocationComingSoon place={countryName} />
          )}
        </div>
      </div>
    </section>
  )
}
