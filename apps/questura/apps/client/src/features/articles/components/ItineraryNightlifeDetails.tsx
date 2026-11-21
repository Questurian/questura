'use client'

import type { JSX } from 'react'
import { Music2 } from 'lucide-react'
import {
  DetailsGrid,
  DetailsSection,
  ItineraryDetailsModal,
  type DetailsItem,
} from '@/features/articles/components/ItineraryDetailsModal'
import type { GridCell } from '@/features/articles/components/ListicleVenueInfoGrid'
import {
  WEEK_ORDER,
  formatPeakHours,
  hoursStatus,
  isOpenOn,
  parseWeekHours,
  summarizeWeek,
  type WeekHours,
} from '@/features/articles/lib/venueHours'
import {
  levelScale,
  priceScale,
  sizeScale,
  type ScaleReading,
} from '@/features/articles/lib/venueScale'
import type { ListicleVenue } from '@/features/articles/types/mapsListicle'
import { clockInTimeZone } from '@/lib/dates'

const accentClass =
  'maps-listicle-info-icon text-[var(--maps-listicle-accent)] shrink-0 size-[15px] 480:size-[16px] sm:size-[17px]'

const kickerClass = 'font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-accent'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function group(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) return {}
  const child = value[key]
  return isRecord(child) ? child : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function displayText(value: string): string {
  // "21-30" is an age range, not a slug: keep it as "21–30".
  const normalized = value
    .replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
    .replace(/_+|(?<=[a-z])-(?=[a-z])/gi, ' ')
    .trim()
  if (!normalized) return ''
  if (/[A-Z]/.test(normalized)) return normalized
  return normalized[0].toUpperCase() + normalized.slice(1)
}

function list(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
    .map(displayText)
    .join(', ')
}

type Meter = { key: string; label: string; value: string; scale: ScaleReading | null }

type NightlifeDetails = {
  subtitle: string
  footer: string
  peak: string
  week: WeekHours | null
  timeZone: string
  meters: Meter[]
  items: DetailsItem[]
}

function readNightlife(item: ListicleVenue, hideHours: boolean): NightlifeDetails {
  const raw = item as unknown as Record<string, unknown>
  const profile = group(raw, 'nightlifeDetails')
  const core = group(profile, 'core')
  const space = group(profile, 'theSpace')
  const scene = group(profile, 'theScene')
  const details = group(profile, 'theDetails')
  const locationRef = group(raw, 'locationRef')

  const clubType = displayText(text(core.clubType) || text(item.type))
  const neighborhood = text(locationRef.neighborhoodName)

  const fallbackPrice = text(item.priceLevel)
  const price =
    text(core.priceTier) || (/^[1-4]$/.test(fallbackPrice) ? '$'.repeat(Number(fallbackPrice)) : '')

  const meters: Meter[] = []
  const meter = (key: string, label: string, value: string, read: (v: string) => ScaleReading | null) => {
    if (value) meters.push({ key, label, value: displayText(value), scale: read(value) })
  }
  meter('energy', 'Energy', text(scene.energyLevel), levelScale)
  meter('size', 'Venue size', text(space.venueSize), sizeScale)
  meter('tourists', 'Tourists', text(scene.touristPresence), levelScale)
  meter('price', 'Price', price, priceScale)

  const items: DetailsItem[] = []
  const add = (key: string, label: string, value: string) => {
    if (value) items.push({ key, label, value })
  }
  add('music', 'Music', list(core.music))
  add('format', 'Format', list(scene.musicFormat))
  add('dress', 'Dress code', list(scene.dressCode))
  add('crowd', 'Crowd', displayText(text(scene.crowdProfile)))
  add('venue', 'Venue', displayText(text(space.venueType)))
  add('vip', 'VIP & bottles', displayText(text(scene.vipAndBottleService)))
  if (typeof details.daytimeRestaurant === 'boolean') {
    add('daytime', 'Daytime restaurant', details.daytimeRestaurant ? 'Yes' : 'No')
  }
  add('layout', 'Layout', list(space.spaceLayout))
  add('vibe', 'Vibe', list(space.vibe))
  add('ideal', 'Ideal for', list(core.idealFor))
  add('email', 'Email', text(raw.email))

  const footer = [neighborhood, text(locationRef.cityName), text(locationRef.countryName)]
    .filter(Boolean)
    .join(', ')

  return {
    subtitle: [clubType, neighborhood].filter(Boolean).join(' · '),
    footer,
    peak: text(space.peakHours) ? formatPeakHours(text(space.peakHours)) : '',
    week: hideHours ? null : parseWeekHours(details.operationHours),
    timeZone: text(raw.ianaTimeId),
    meters,
    items,
  }
}

function Diamond(): JSX.Element {
  return <span aria-hidden className="mb-px mr-2 inline-block size-1.5 rotate-45 bg-accent" />
}

function ScaleBar({ scale }: { scale: ScaleReading }): JSX.Element {
  return (
    <span
      aria-hidden
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${scale.of}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: scale.of }, (_, index) => (
        <i
          key={index}
          className={index < scale.filled ? 'block h-1.5 bg-accent' : 'block h-1.5 bg-foreground/15'}
        />
      ))}
    </span>
  )
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function NightlifeBody({ details }: { details: NightlifeDetails }): JSX.Element {
  const { week, peak, meters, items } = details
  const clock = week ? clockInTimeZone(new Date(), details.timeZone) : null
  const status = week && clock ? hoursStatus(week, clock) : null
  const peakText = peak ? `peaks ${peak}` : ''

  return (
    <>
      {status || peak ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-foreground/10 bg-paper px-5 py-3 text-[13px]">
          <span className={`${kickerClass} shrink-0`}>
            <Diamond />
            {status ? status.label : 'Peak hours'}
          </span>
          <span className="text-right tabular-nums">
            {status ? (
              <>
                <strong className="font-semibold">{status.detail}</strong>
                {peakText ? <span className="text-foreground/70"> · {peakText}</span> : null}
              </>
            ) : (
              <strong className="font-semibold">{peak}</strong>
            )}
          </span>
        </div>
      ) : null}

      {meters.length > 0 ? (
        <DetailsSection label="At a glance">
          <dl className="m-0 grid grid-cols-[7.5em_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[13px]">
            {meters.map((m) => (
              <div key={m.key} className="contents">
                <dt className="text-foreground/55">{m.label}</dt>
                <dd className="m-0">{m.scale ? <ScaleBar scale={m.scale} /> : null}</dd>
                <dd className="m-0 min-w-[4.5em] text-right">{m.value}</dd>
              </div>
            ))}
          </dl>
        </DetailsSection>
      ) : null}

      {items.length > 0 ? (
        <DetailsSection label="The details">
          <DetailsGrid items={items} />
        </DetailsSection>
      ) : null}

      {week ? (
        <DetailsSection label="This week">
          <ol className="m-0 grid list-none grid-cols-7 gap-1 p-0 text-center text-[11px]">
            {WEEK_ORDER.map((day) => {
              const today = clock?.day === day
              return (
                <li key={day}>
                  <span
                    className={
                      today ? 'block pb-1.5 font-semibold' : 'block pb-1.5 text-foreground/55'
                    }
                  >
                    {DAY_LETTERS[day]}
                  </span>
                  <span
                    aria-hidden
                    className={isOpenOn(week, day) ? 'block h-1 bg-accent' : 'block h-1 bg-foreground/15'}
                  />
                </li>
              )
            })}
          </ol>
          <dl className="m-0 mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12.5px] tabular-nums">
            {summarizeWeek(week).map((line) => (
              <div key={line.days} className={line.closed ? 'contents text-foreground/55' : 'contents'}>
                <dt>{line.days}</dt>
                <dd className="m-0 text-right">{line.hours}</dd>
              </div>
            ))}
          </dl>
        </DetailsSection>
      ) : null}
    </>
  )
}

export function buildNightlifeDetailsCell(item: ListicleVenue, hideHours = false): GridCell | null {
  const details = readNightlife(item, hideHours)
  if (
    details.meters.length === 0 &&
    details.items.length === 0 &&
    !details.week &&
    !details.peak
  ) {
    return null
  }

  return {
    key: 'nightlife-details',
    icon: <Music2 className={accentClass} strokeWidth={1.75} aria-hidden />,
    node: (
      <ItineraryDetailsModal
        kicker="Nightlife details"
        venueTitle={item.title}
        subtitle={details.subtitle}
        footer={details.footer}
      >
        {() => <NightlifeBody details={details} />}
      </ItineraryDetailsModal>
    ),
  }
}
