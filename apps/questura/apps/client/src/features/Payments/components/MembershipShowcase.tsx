import type { ReactNode } from 'react';

import { PublicImage } from '@/components/media/PublicImage';
import { BANNER_TYPE } from '@/features/sections/bannerFont';
import FeatureSlideshow from './FeatureSlideshow';
import {
  CATEGORY_PHOTOS,
  CITY_GUIDE_SPREADS,
  LISTICLE_PLACES,
  LOCAL_INTEL_SPREADS,
  STATIC_MAP_SIZE,
  staticMapUrl,
  type ListiclePlace,
  type StorySpread,
} from '../lib/joinShowcase';

/*
 * The picture column is up to 518px wide (342px on a phone), but the sizes are
 * set a little under that so 2x and 3x screens take the 960px rung: the six
 * pile photos all load together, and the 1920px originals are ~450 kB each.
 */
const PICTURE_SIZES = '(min-width: 768px) 480px, 320px';
const CARD_SIZES = '(min-width: 1180px) 240px, (min-width: 768px) 21vw, 46vw';
const PLACE_PHOTO_SIZES = '(min-width: 1180px) 260px, (min-width: 768px) 23vw, 50vw';

function FeatureRow({
  id,
  category,
  title,
  description,
  reverse = false,
  children,
}: {
  id: string;
  category: string;
  title: string;
  description: string;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      className={`membership-feature${reverse ? ' membership-feature--reverse' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="feature-copy">
        <p className="feature-category">{category}</p>
        <h3 id={`${id}-title`}>{title}</h3>
        <p className="feature-description">{description}</p>
      </div>
      {children}
    </article>
  );
}

function StoryComposition({ spread, light }: { spread: StorySpread; light: boolean }) {
  const classes = [
    'composition intel-composition',
    light ? 'intel-composition--light' : '',
    spread.tilt === 'right' ? 'intel-composition--alternate' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const positions = ['intel-left', 'intel-main', 'intel-right'];

  return (
    <div className={classes} aria-hidden="true">
      {spread.cards.map((card, index) => (
        <div key={positions[index]} className={`dark-story ${positions[index]}`}>
          <PublicImage src={card.src} sizes={CARD_SIZES} alt="" />
          <div className="dark-story-copy">
            <span>{card.section}</span>
            <h4>{card.title}</h4>
            <p>{card.dek}</p>
            <small>{card.byline}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
  </svg>
);

function ListiclePreview({ place }: { place: ListiclePlace }) {
  const map = staticMapUrl(place, process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <div className="composition listicle-preview" aria-hidden="true">
      <div className="listicle-preview-details">
        <div className="listicle-preview-media">
          <PublicImage className="listicle-preview-photo" src={place.photo} sizes={PLACE_PHOTO_SIZES} alt="" />
          <span className="listicle-preview-arrow listicle-preview-arrow--previous" />
          <span className="listicle-preview-arrow listicle-preview-arrow--next" />
          <span className="listicle-preview-count">{place.photoPosition}</span>
        </div>
        <div className="listicle-preview-caption">{place.caption}</div>
        <div className="listicle-preview-heading">
          <h4>{place.name}</h4>
          <span className="listicle-preview-price">·&nbsp;&nbsp;{place.price}</span>
        </div>
        <p className="listicle-preview-description">{place.description}</p>
        <p className="listicle-preview-ideal">
          <strong>Ideal for:</strong> {place.idealFor}
        </p>
        <div className="listicle-preview-address">
          <PinIcon />
          <span>{place.address}</span>
        </div>
        <div className="listicle-preview-tools">
          <span>
            <ClockIcon />
            See hours
          </span>
          <span>
            <GlobeIcon />
            Visit website
          </span>
        </div>
        <div className="listicle-preview-reserve">RESERVE A TABLE</div>
      </div>
      <div className="listicle-preview-map">
        {map ? (
          // eslint-disable-next-line @next/next/no-img-element -- a Google Static Maps image; it carries Google's own attribution and must not be re-encoded.
          <img
            src={map}
            alt=""
            width={STATIC_MAP_SIZE.width}
            height={STATIC_MAP_SIZE.height}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="listicle-preview-map-pin" />
        )}
      </div>
    </div>
  );
}

/**
 * "What membership unlocks" on /join: four rows, each a short pitch beside a
 * picture of the real thing (Design 101). The pictures are artwork, hidden
 * from screen readers; each still says what it shows instead.
 */
export default function MembershipShowcase() {
  return (
    <>
      <section id="showcase" className="membership-scenes" aria-labelledby="membership-scenes-title">
        <header className="scenes-intro">
          <h2 id="membership-scenes-title">What membership unlocks</h2>
          <p>Food, places, and stories. A closer look at the cities you’re curious about.</p>
        </header>

        <FeatureRow
          id="eat-stay"
          category="Eat & stay"
          title="Eat well. Stay somewhere good."
          description="The meal you’ll talk about when you get home. The neighborhood you’ll want to return to. Discover food guides, places to stay, and the details that make a trip feel like your own. From a ceviche lunch to a room in Barranco, our local writers help you find places worth making time for."
        >
          <FeatureSlideshow
            label="Eat, Stay and Itinerary"
            variant="stack"
            className="feature-pair--categories"
            slides={CATEGORY_PHOTOS.map((photo) => ({
              key: `${photo.category}-${photo.photo}`,
              label: `Questurian ${photo.category}, photo ${photo.photo} of 2`,
              content: (
                <>
                  <PublicImage className="category-photo" src={photo.src} sizes={PICTURE_SIZES} alt="" />
                  <figcaption className="category-card-title" aria-hidden="true">
                    <span className="category-wordmark">Questurian</span>
                    <strong className={`category-name ${BANNER_TYPE}`} data-category={photo.category}>
                      {photo.category}
                    </strong>
                  </figcaption>
                </>
              ),
            }))}
          />
        </FeatureRow>

        <FeatureRow
          id="city-guides"
          category="City guides"
          title="Get to know a city before you go."
          description="Start with the big picture, then follow your curiosity. Explore neighborhood deep-dives, food stories, and places that give a city its character—all together in one place. Find your bearings with our city guides, then keep reading for the sunset spot, breakfast stop, or small discovery that turns a good trip into a memorable one."
          reverse
        >
          <FeatureSlideshow
            label="City guides"
            className="feature-pair--city-cards"
            slides={CITY_GUIDE_SPREADS.map((spread) => ({
              key: spread.choice,
              label: spread.label,
              content: <StoryComposition spread={spread} light />,
            }))}
          />
        </FeatureRow>
      </section>

      <section className="membership-in-action" aria-label="More membership benefits">
        <FeatureRow
          id="places-maps"
          category="Places & maps"
          title="Good recommendations. Useful details."
          description="A restaurant is more than a pin on a map. Read what makes it worth visiting, see the room and the food, and find the practical details in the same guide. Switch between the list and map to see where places are, compare your options, and build a day around what catches your eye."
        >
          <FeatureSlideshow
            label="Places & maps"
            className="feature-pair--listicle"
            slides={LISTICLE_PLACES.map((place) => ({
              key: place.choice,
              label: `A listicle entry for ${place.name}: restaurant photo, short description and practical details, with its location map.`,
              content: <ListiclePreview place={place} />,
            }))}
          />
        </FeatureRow>

        <FeatureRow
          id="local-intel"
          category="Essential local intel"
          title="Know what matters before you go."
          description="The details you need before a night out, from drink-spiking risks to local nightlife and practical city advice. Our writers explain what to watch for, what to plan around, and what’s worth knowing before you arrive. Get the context behind the headlines, so you can make informed choices throughout your trip."
          reverse
        >
          <FeatureSlideshow
            label="Essential local intel"
            slides={LOCAL_INTEL_SPREADS.map((spread) => ({
              key: spread.choice,
              label: spread.label,
              content: <StoryComposition spread={spread} light={false} />,
            }))}
          />
        </FeatureRow>
      </section>
    </>
  );
}
