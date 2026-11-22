import { BedDouble, Fish, Flame, Martini, Music, Route, Sunset, Utensils, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { preload } from 'react-dom'

import { JoinImage } from './components/JoinImage'
import { BecomeMember, GuideCard, GuideLead, GuideRow, GuideRows, PlansJump } from './components/PlansLinks'
import RooftopMap from './components/RooftopMap'
import { PHOTOS, type JoinPhoto } from './data/photos'

/*
 * Design B, "The front page": everything at a glance, dark at every size
 * (owner, 2026-11-22).
 * Counts are from the guides' own descriptions. Only locked guides are shown
 * as what membership opens.
 */

// Phone tiles run taller than wide (as narrow as 0.68) on tall screens.
// The wide layout is 1280 at most, so its widths are that frame's.
const TILE_SIZES = '(min-width: 1024px) 246px, (min-width: 768px) 229px, calc(33vw - 12px)'
const BIG_TILE_SIZES = '(min-width: 1024px) 500px, (min-width: 768px) 229px, calc(33vw - 12px)'
const LEAD_SIZES = '(min-width: 1024px) 632px, (min-width: 768px) 704px, calc(100vw - 40px)'
const WIDE_LEAD_SIZES = '(min-width: 1024px) 848px, (min-width: 768px) 704px, calc(100vw - 40px)'
const GRID_SIZES = '(min-width: 1024px) 200px, (min-width: 768px) 224px, calc(33vw - 20px)'
const THIRD_SIZES = '(min-width: 1024px) 416px, (min-width: 768px) 224px, calc(33vw - 20px)'
const DRINK_ROW_SIZES = '(min-width: 1024px) 416px, (min-width: 768px) 96px, 76px'
const STAY_ROW_SIZES = '(min-width: 1024px) 308px, (min-width: 768px) 96px, 76px'
const GO_ROW_SIZES = '(min-width: 1024px) 200px, (min-width: 768px) 96px, 76px'
const MAP_SIZES = '(min-width: 1024px) 499px, (min-width: 768px) 704px, calc(100vw - 40px)'

const MOSAIC: Array<{ href: string; photo: JoinPhoto; label: string; Icon: LucideIcon }> = [
  { href: '#eat', photo: PHOTOS.cevicheSquare, label: 'Ceviche', Icon: Fish },
  { href: '#drink', photo: PHOTOS.sunsetSquare, label: 'Sunsets', Icon: Sunset },
  { href: '#drink', photo: PHOTOS.club, label: 'Nightlife', Icon: Music },
  { href: '#eat', photo: PHOTOS.anticucho, label: 'Street food', Icon: Flame },
  { href: '#stay', photo: PHOTOS.pool, label: 'Stays', Icon: BedDouble },
  { href: '#go', photo: PHOTOS.dunes, label: 'Day trips', Icon: Route },
]

function Hero({ startPrice }: { startPrice: ReactNode }) {
  return (
    <section className="jp-b-hero" aria-labelledby="join-title">
      <div className="jp-container jp-b-hero-grid">
        <h1 id="join-title" className="jp-banner jp-b-title">
          <span>Lima’s</span> <span>too good</span> <span>to guess.</span>
        </h1>
        <p className="jp-lead-text jp-b-hero-line">Food, bars, places to stay and whole days out, picked and mapped.</p>
        <ul className="jp-mosaic">
          {MOSAIC.map(({ href, photo, label, Icon }, i) => (
            <li key={label}>
              <a href={href} className="jp-tile" data-photo-frame>
                <JoinImage photo={photo} sizes={i === 0 ? BIG_TILE_SIZES : TILE_SIZES} frame={0.68} priority={i < 3} />
                <span className="jp-tile-label" data-photo-overlay>
                  <Icon className="jp-icon-16" aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} />
                  {label}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <BecomeMember price={startPrice} />
      </div>
    </section>
  )
}

function Category({
  id,
  word,
  Icon,
  line,
  link,
  children,
}: {
  id: string
  word: string
  Icon: LucideIcon
  line: string
  link: string
  children: ReactNode
}) {
  return (
    <section id={id} className="jp-cat" aria-labelledby={`${id}-title`}>
      <div className="jp-container">
        <div className="jp-cat-head">
          <h2 id={`${id}-title`} className="jp-banner jp-cat-word">
            {word}
          </h2>
          <p className="jp-lead-text jp-cat-line">{line}</p>
          <Icon className="jp-icon-40" aria-hidden="true" absoluteStrokeWidth strokeWidth={2} />
        </div>
        <div className="jp-cat-body">{children}</div>
        <PlansJump>{link}</PlansJump>
      </div>
    </section>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="jp-grid">{children}</div>
}

/**
 * B's headline face: Archivo at width 72, weight 800, cut down to capitals,
 * figures and punctuation (13.5 kB; Google Fonts, OFL). Preloaded here, so only
 * a page that shows B asks for it; A and every other route never do. The
 * site's next/font Archivo (bannerFont.ts) is 90 kB and not preloaded, which
 * on a slow phone left this headline in a fallback face for six seconds.
 */
export const BANNER_FONT_URL = '/fonts/archivo-banner-72-800-v1.woff2'

export default function FrontPage({ startPrice }: { startPrice: ReactNode }) {
  preload(BANNER_FONT_URL, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous', fetchPriority: 'high' })
  return (
    <>
      <Hero startPrice={startPrice} />
      <Category id="eat" word="Eat" Icon={Utensils} line="From a sidewalk grill to the best tables in the world." link="Get the food guides">
        <GuideLead photo={PHOTOS.fine} title="32 fine dining restaurants" hook="Grouped by the kind of meal you want" sizes={LEAD_SIZES} />
        <Grid>
          <GuideCard photo={PHOTOS.cevicheSquare} title="15 ceviche spots" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.anticucho} title="15 places for anticuchos" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.lomo} title="13 lomo saltados" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.chifa} title="The best chifa" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.pollo} title="Pollo a la brasa" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.sandwich} title="The best sandwiches" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.brunch} title="17 brunch spots" sizes={THIRD_SIZES} />
          <GuideCard photo={PHOTOS.isidro} title="San Isidro right now" sizes={THIRD_SIZES} />
          <GuideCard photo={PHOTOS.central} title="A table at Central" sizes={THIRD_SIZES} />
        </Grid>
      </Category>
      <Category id="drink" word="Drink" Icon={Martini} line="Start at sunset. End when the music stops." link="Get every map">
        <GuideLead photo={PHOTOS.sunsetWide} title="18 places to watch the sunset" hook="Cliff parks, rooftops, dinner over the waves" sizes={WIDE_LEAD_SIZES} />
        <GuideRows>
          <GuideRow photo={PHOTOS.rooftop} title="18 rooftop bars" hook="Cocktail terraces and rooftop salsa" sizes={DRINK_ROW_SIZES} />
          <GuideRow photo={PHOTOS.club} title="The best nightclubs" hook="Dance till dawn in Miraflores and Barranco" sizes={DRINK_ROW_SIZES} />
          <GuideRow photo={PHOTOS.bars} title="The best bars in Barranco" hook="Cocktail lounges to loud, packed pubs" sizes={DRINK_ROW_SIZES} />
        </GuideRows>
        <RooftopMap sizes={MAP_SIZES} />
      </Category>
      <Category id="stay" word="Stay" Icon={BedDouble} line="Wake up somewhere good, on your budget." link="Find your place to stay">
        <GuideLead photo={PHOTOS.pool} title="Airbnbs under $150 a night" hook="The best across Lima" sizes={LEAD_SIZES} />
        <Grid>
          <GuideCard photo={PHOTOS.terrace} title="Miraflores under $75" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.loft} title="Miraflores under $150" sizes={GRID_SIZES} />
          <GuideCard photo={PHOTOS.room} title="Barranco under $150" sizes={GRID_SIZES} />
        </Grid>
        <GuideRows>
          <GuideRow photo={PHOTOS.homes} title="The best Airbnbs in Miraflores" hook="The ones we would book ourselves" sizes={STAY_ROW_SIZES} />
          <GuideRow photo={PHOTOS.ocean} title="Places to stay with ocean views" hook="Hotels and rental homes" sizes={STAY_ROW_SIZES} />
        </GuideRows>
      </Category>
      <Category id="go" word="Go" Icon={Route} line="Whole days and nights, planned stop by stop." link="Get the itineraries">
        <GuideLead photo={PHOTOS.dunes} title="Four days in Lima" hook="With the islands and the dunes" sizes={WIDE_LEAD_SIZES} />
        <GuideRows>
          <GuideRow photo={PHOTOS.oneDay} title="One day in Lima" hook="Old center, cliffs, dinner at Kjolle" sizes={GO_ROW_SIZES} />
          <GuideRow photo={PHOTOS.night} title="One night in Barranco" hook="Four bars, each louder than the last" sizes={GO_ROW_SIZES} />
        </GuideRows>
      </Category>
    </>
  )
}
