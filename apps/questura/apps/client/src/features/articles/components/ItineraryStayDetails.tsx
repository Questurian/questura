'use client'

import type { JSX } from 'react'
import { BedDouble } from 'lucide-react'
import {
  DetailsRows,
  DetailsSection,
  ItineraryDetailsModal,
  type DetailsItem,
} from '@/features/articles/components/ItineraryDetailsModal'
import { formatPriceTier, isHttpUrl } from '@/features/articles/lib/listicleVenueFormatters'
import type { GridCell } from '@/features/articles/components/ListicleVenueInfoGrid'
import type { ListicleVenue } from '@/features/articles/types/mapsListicle'

/**
 * Full accommodation profile for the "Where you're staying" card, surfacing
 * every field the accommodations data point ships (exploration pass — prune
 * once the keep/drop call is made). Compact pieces (meta row, chips, booking
 * card) render inline; the long amenity list lives behind a modal triggered
 * from the venue info grid, mirroring the hours modal.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function group(item: ListicleVenue, key: string): Record<string, unknown> {
  const value = (item as unknown as Record<string, unknown>)[key]
  return isRecord(value) ? value : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
}

/** "15:00" → "3:00 PM"; anything unparseable passes through untouched. */
function formatClockTime(raw: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return raw
  const hours = Number(match[1])
  if (hours > 23) return raw
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${match[2]} ${suffix}`
}

const accentClass =
  'maps-listicle-info-icon text-[var(--maps-listicle-accent)] shrink-0 size-[15px] 480:size-[16px] sm:size-[17px]'

type StaySection = { label: string; items: DetailsItem[] }

/** Option A (owner, 2026-11-20): three labelled groups of label/value rows, no icons. */
function buildStaySections(item: ListicleVenue): StaySection[] {
  const raw = item as unknown as Record<string, unknown>
  const core = group(item, 'core')
  const theStay = group(item, 'theStay')
  const theExperience = group(item, 'theExperience')
  const theDetails = group(item, 'theDetails')

  const section = (label: string) => {
    const items: DetailsItem[] = []
    const add = (key: string, name: string, value: string) => {
      if (value) items.push({ key, label: name, value })
    }
    const addBool = (key: string, name: string, value: unknown) => {
      const b = bool(value)
      if (b !== null) add(key, name, b ? 'Yes' : 'No')
    }
    const addList = (key: string, name: string, value: unknown) => {
      add(key, name, list(value).map(titleCase).join(', '))
    }
    return { label, items, add, addBool, addList }
  }

  const basics = section('The basics')
  const stayType = text(core.type) || text(item.type)
  basics.add('stay-type', 'Stay type', stayType ? titleCase(stayType) : '')
  basics.add('price', 'Price', formatPriceTier(core.price))
  basics.add('district', 'Neighborhood', text(core.district))
  const checkIn = text(theDetails.checkInTime)
  basics.add('check-in', 'Check-in', checkIn ? formatClockTime(checkIn) : '')
  const checkOut = text(theDetails.checkOutTime)
  basics.add('check-out', 'Check-out', checkOut ? formatClockTime(checkOut) : '')
  basics.add('email', 'Email', text(raw.email))

  const stay = section('The stay')
  stay.addBool('wifi', 'Wi-Fi', theStay.wifi)
  stay.addBool('ac', 'Air conditioning', theStay.ac)
  stay.addBool('breakfast', 'Breakfast', theStay.breakfastServed)
  stay.addBool('kids', 'Kid-friendly', theStay.kidFriendly)
  stay.addBool('extra-guest', 'Extra guest fee', theStay.extraGuestFee)
  stay.addList('parking', 'Parking', theStay.parking)

  const experience = section('The experience')
  experience.addList('vibe', 'Vibe', theExperience.vibe)
  experience.addBool('restaurant', 'Restaurant', theExperience.restaurant)
  experience.addList('pool', 'Pool', theExperience.pool)
  experience.addBool('rooftop', 'Rooftop lounge', theExperience.rooftopLounge)
  experience.addList('jacuzzi', 'Jacuzzi', theExperience.jacuzzi)
  const gym = text(theExperience.gym)
  experience.add('gym', 'Gym', gym && gym !== 'None' ? gym : '')
  const workspace = text(theExperience.workspace)
  experience.add('workspace', 'Workspace', workspace && workspace !== 'None' ? workspace : '')
  experience.add('walkability', 'Getting around', text(theDetails.walkability))

  return [basics, stay, experience]
    .filter((s) => s.items.length > 0)
    .map(({ label, items }) => ({ label, items }))
}

function buildFooter(item: ListicleVenue): string {
  const raw = item as unknown as Record<string, unknown>
  const locationRef = group(item, 'locationRef')
  const place = [
    text(locationRef.neighborhoodName),
    text(locationRef.cityName),
    text(locationRef.countryName),
  ]
    .filter(Boolean)
    .join(', ')
  const source = text(raw.sourceName)
  return [place, source && source !== item.title ? `Source: ${source}` : '']
    .filter(Boolean)
    .join(' · ')
}

/**
 * Cell for ListicleVenueInfoGrid's `extraCells` opening the amenities modal.
 * Null when the accommodation has no profile data to show.
 */
export function buildStayAmenitiesCell(item: ListicleVenue): GridCell | null {
  const sections = buildStaySections(item)
  if (sections.length === 0) return null

  const core = group(item, 'core')
  const stayType = text(core.type) || text(item.type)
  const subtitle = [stayType ? titleCase(stayType) : '', text(core.district)]
    .filter(Boolean)
    .join(' · ')

  return {
    key: 'stay-amenities',
    icon: <BedDouble className={accentClass} strokeWidth={1.75} aria-hidden />,
    node: (
      <ItineraryDetailsModal
        kicker="Stay details"
        venueTitle={item.title}
        subtitle={subtitle}
        footer={buildFooter(item)}
      >
        {() =>
          sections.map((s) => (
            <DetailsSection key={s.label} label={s.label}>
              <DetailsRows items={s.items} />
            </DetailsSection>
          ))
        }
      </ItineraryDetailsModal>
    ),
  }
}

/** Nav-style "BOOK NOW" link wired to the accommodation profile booking URL. */
export function ItineraryStayBookingCard({ item }: { item: ListicleVenue }): JSX.Element | null {
  const theDetails = group(item, 'theDetails')
  const bookingRaw = text(theDetails.bookingUrl) || text(item.bookingUrl)
  if (!bookingRaw) return null
  const bookingHref = isHttpUrl(bookingRaw) ? bookingRaw : `https://${bookingRaw}`

  return (
    <a
      href={bookingHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-14 w-full items-center justify-center rounded-none bg-[#111111] px-5 font-[var(--font-dm-sans)] text-[0.9rem] font-light leading-none tracking-[0.015em] text-white transition-colors duration-150 ease-out hover:bg-[#3B5BDB] active:bg-[#3451C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/50 focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      BOOK NOW
    </a>
  )
}
