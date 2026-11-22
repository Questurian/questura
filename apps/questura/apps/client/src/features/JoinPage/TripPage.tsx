import { BedDouble, Headphones, MapPin, Martini, Route } from 'lucide-react'
import type { ReactNode } from 'react'

import { PicturePreload } from '@/components/media/PicturePreload'
import { PublicImage, PublicSource } from '@/components/media/PublicImage'
import { capDensity, JoinImage } from './components/JoinImage'
import { BecomeMember, GuideCard, GuideRow, GuideRows, PlansJump } from './components/PlansLinks'
import PhotoQueue from './components/PhotoQueue'
import RooftopMap from './components/RooftopMap'
import { PHOTOS, type JoinPhoto } from './data/photos'

/*
 * Design A, "The trip": the page is four days in Lima (owner, 2026-11-22).
 * The day summaries come from the four-day itinerary's public introduction,
 * never its locked stops, and the rows under each day are related guides, not
 * that day's stops. Counts are from the guides' own descriptions.
 */

const HERO_WIDE = '(min-width: 768px)'
const HERO_SIZES = '100vw'
const HERO_PHONE_SIZES = capDensity(HERO_SIZES)
const DAY_SIZES = '(min-width: 1024px) 544px, (min-width: 768px) 704px, 100vw'
const SHORT_SIZES = '(min-width: 1024px) 264px, (min-width: 768px) 344px, calc(50vw - 24px)'

function Hero() {
  return (
    <section className="jp-a-hero" aria-labelledby="join-title" data-photo-frame>
      <PicturePreload
        source={{ src: PHOTOS.coastHero.src, media: HERO_WIDE, sizes: HERO_SIZES }}
        fallback={{ src: PHOTOS.coastPortrait.src, sizes: HERO_PHONE_SIZES }}
      />
      <picture>
        <PublicSource media={HERO_WIDE} src={PHOTOS.coastHero.src} sizes={HERO_SIZES} />
        <PublicImage
          src={PHOTOS.coastPortrait.src}
          width={PHOTOS.coastPortrait.width}
          height={PHOTOS.coastPortrait.height}
          sizes={HERO_PHONE_SIZES}
          priority
          className="jp-img jp-a-hero-img"
        />
      </picture>
      <div className="jp-container jp-a-hero-copy">
        <h1 id="join-title" className="jp-a-title">
          <span>Four great days</span> <span>in Lima.</span> <span>Already planned.</span>
        </h1>
        <p className="jp-body jp-a-hero-line">
          Where to eat, drink, sleep and catch the sunset, with every stop on a map.
        </p>
        <BecomeMember />
      </div>
    </section>
  )
}

const INDEX = [
  { href: '#day-1', label: 'Itineraries', Icon: Route },
  { href: '#maps', label: 'Maps', Icon: MapPin },
  { href: '#day-4', label: 'Nightlife', Icon: Martini },
  { href: '#stay', label: 'Stays', Icon: BedDouble },
]

function Index() {
  return (
    <nav className="jp-a-index" aria-label="On this page">
      <ul className="jp-container">
        {INDEX.map(({ href, label, Icon }) => (
          <li key={href}>
            <a href={href}>
              <Icon className="jp-icon-24" aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Day({
  id,
  photo,
  title,
  text,
  children,
}: {
  id: string
  photo: JoinPhoto
  title: string
  text: string
  children: ReactNode
}) {
  return (
    <section id={id} className="jp-day" aria-labelledby={`${id}-title`}>
      <div className="jp-container jp-day-grid">
        <div className="jp-day-photo" data-photo-frame>
          <JoinImage photo={photo} sizes={DAY_SIZES} frame={3 / 2} />
          <h2 id={`${id}-title`} className="jp-day-title">
            {title}
          </h2>
        </div>
        <div className="jp-day-body">
          <p className="jp-lead-text">{text}</p>
          {children}
        </div>
      </div>
    </section>
  )
}

function MapBand() {
  return (
    <section id="maps" className="jp-mapband" aria-labelledby="maps-title">
      <div className="jp-container jp-mapband-grid">
        <div className="jp-mapband-copy">
          <h2 id="maps-title" className="jp-section-title">
            It’s all on the map
          </h2>
          <p className="jp-body">18 rooftop bars, from the old center to Barranco.</p>
        </div>
        <RooftopMap sizes="(min-width: 1024px) 544px, (min-width: 768px) 704px, 100vw" />
        <div className="jp-mapband-link">
          <PlansJump>Get every map</PlansJump>
        </div>
      </div>
    </section>
  )
}

function OneDay() {
  return (
    <section className="jp-short" aria-labelledby="short-title">
      <div className="jp-container">
        <h2 id="short-title" className="jp-section-title">
          Only here for a day?
        </h2>
        <div className="jp-pair">
          <GuideCard photo={PHOTOS.oneDay} title="One day in Lima" hook="Old center, cliffs, dinner at Kjolle" sizes={SHORT_SIZES} />
          <GuideCard photo={PHOTOS.night} title="One night in Barranco" hook="Four bars, each louder than the last" sizes={SHORT_SIZES} />
        </div>
      </div>
    </section>
  )
}

function Listen() {
  return (
    <a href="#plans" className="jp-listen">
      <span className="sr-only">Membership: </span>
      <span className="jp-container jp-listen-inner">
        <Headphones className="jp-icon-40" aria-hidden="true" absoluteStrokeWidth strokeWidth={2} />
        <span className="jp-listen-copy">
          <span className="jp-title">The Questurian Guide to Lima, read aloud</span>
          <span className="jp-fine">Listen while you pack</span>
        </span>
      </span>
    </a>
  )
}

export default function TripPage() {
  return (
    <>
      <PhotoQueue />
      <Hero />
      <Index />
      <Day
        id="day-1"
        photo={PHOTOS.road}
        title="Day 1: Miraflores, on foot"
        text="The clifftops from the lighthouse to Larcomar, a pyramid older than the Inca, then dinner and a hidden bar a few doors away."
      >
        <GuideRows>
          <GuideRow photo={PHOTOS.sunsetWide} title="18 places to watch the sunset" hook="Free cliff parks, rooftops, dinner over the waves" />
          <GuideRow photo={PHOTOS.brunch} title="17 spots for brunch" hook="Criollo breakfasts, bakeries, hotel buffets" />
        </GuideRows>
        <PlansJump>Get all four days</PlansJump>
      </Day>
      <Day
        id="day-2"
        photo={PHOTOS.cathedral}
        title="Day 2: The old city, then a long dinner"
        text="Catacombs under San Francisco, carved balconies on Plaza Mayor, and turrón to carry home."
      >
        <GuideRows>
          <GuideRow photo={PHOTOS.lomo} title="13 lomo saltados worth the trip" hook="From market stalls to old criollo taverns" />
          <GuideRow photo={PHOTOS.fine} title="32 fine dining restaurants" hook="Grouped by the kind of meal you want" />
          <GuideRow photo={PHOTOS.central} title="A table at Central, Maido or Kjolle" hook="When to book, and how to work the waitlist" />
        </GuideRows>
        <PlansJump>Get the restaurant guides</PlansJump>
      </Day>
      <MapBand />
      <Day
        id="day-3"
        photo={PHOTOS.dunes}
        title="Day 3: Islands by morning, dunes by afternoon"
        text="The Ballestas Islands, the Paracas reserve and a buggy across Huacachina. We tell you which boat to book and how to get there."
      >
        <PlansJump>Get the day trip</PlansJump>
      </Day>
      <Day
        id="day-4"
        photo={PHOTOS.club}
        title="Day 4: Barranco till late"
        text="The Bridge of Sighs at dusk, comfort food, cocktails, then anticuchos straight off the charcoal."
      >
        <GuideRows>
          <GuideRow photo={PHOTOS.bars} title="The best bars in Barranco" hook="Cocktail lounges to loud, packed pubs" />
          <GuideRow photo={PHOTOS.rooftop} title="18 rooftop bars" hook="Sunset dinners, terraces and salsa" />
          <GuideRow photo={PHOTOS.anticucho} title="15 places for anticuchos" hook="Sidewalk carts to proper grills" />
        </GuideRows>
        <PlansJump>Get the nightlife guides</PlansJump>
      </Day>
      <Day
        id="stay"
        photo={PHOTOS.pool}
        title="Wake up somewhere good"
        text="Ocean views, rooftop terraces and old quinta houses, picked by neighborhood and budget."
      >
        <GuideRows>
          <GuideRow photo={PHOTOS.terrace} title="Miraflores under $75 a night" hook="Studios and king beds near Kennedy Park" />
          <GuideRow photo={PHOTOS.room} title="Barranco under $150 a night" hook="Our 13 favorite Airbnbs" />
          <GuideRow photo={PHOTOS.ocean} title="Places to stay with ocean views" hook="Hotels and rental homes" />
        </GuideRows>
        <PlansJump>Find your place to stay</PlansJump>
      </Day>
      <OneDay />
      <Listen />
    </>
  )
}
