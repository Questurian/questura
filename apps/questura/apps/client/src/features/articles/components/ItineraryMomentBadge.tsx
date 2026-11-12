import type { JSX } from "react";
import type { ItineraryMoment } from "@/features/articles/types/itineraryListicle";

/**
 * The badge icons are symbols in one cached SVG file, drawn with <use>, so
 * they cost the page no JavaScript (the itinerary page is over its first-load
 * JS cap). Regenerate with `node scripts/build-moment-icons.mjs` and bump ?v=
 * whenever a moment is added or its icon changes.
 */
export const MOMENT_ICON_SPRITE = "/images/moment-icons.svg?v=3";

export const MOMENT_LABELS: Record<ItineraryMoment, string> = {
  breakfast: "Breakfast",
  coffee: "Coffee break",
  "morning-walk": "Morning walk",
  "remote-work": "Remote work",
  "coworking-stop": "Coworking stop",
  lunch: "Lunch",
  "street-food": "Street food",
  "sweet-treat": "Sweet treat",
  seafood: "Seafood",
  soup: "Soup",
  grill: "Grill",
  bakery: "Bakery",
  "tasting-menu": "Tasting menu",
  culture: "Culture stop",
  "historic-site": "Historic site",
  "museum-visit": "Museum visit",
  landmark: "Must-see landmark",
  church: "Church",
  ruins: "Ancient ruins",
  palace: "Palace",
  bridge: "Bridge",
  lighthouse: "Lighthouse",
  "art-gallery": "Art gallery",
  "street-art": "Street art",
  "literary-stop": "Literary stop",
  "guided-tour": "Guided tour",
  "local-market": "Local market",
  shopping: "Shopping stop",
  outdoor: "Outdoor break",
  "beach-time": "Beach time",
  "scenic-viewpoint": "Scenic viewpoint",
  clifftop: "Clifftop",
  oasis: "Oasis",
  wildlife: "Wildlife",
  "wellness-break": "Wellness break",
  "active-adventure": "Active adventure",
  "boat-ride": "Boat ride",
  pier: "Pier",
  "day-trip": "Day trip",
  "bus-ride": "Bus ride",
  "in-transit": "In transit",
  sunset: "Sunset stop",
  "rooftop-stop": "Rooftop stop",
  dinner: "Dinner",
  cocktails: "Cocktails",
  drinks: "Drinks",
  nightlife: "Nightlife",
};

function isItineraryMoment(value: unknown): value is ItineraryMoment {
  return typeof value === "string" && Object.hasOwn(MOMENT_LABELS, value);
}

export function ItineraryMomentBadge({
  moment,
  label,
}: {
  moment?: string | null;
  label?: string | null;
}): JSX.Element | null {
  if (!isItineraryMoment(moment)) return null;

  const displayLabel = label?.trim() || MOMENT_LABELS[moment];

  return (
    <div className="flex items-center gap-2.5 380:gap-3 480:gap-3.5">
      <svg
        className="size-[26px] shrink-0 text-foreground/40 380:size-[29px] 480:size-[33px] sm:size-[36px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <use href={`${MOMENT_ICON_SPRITE}#${moment}`} />
      </svg>
      <span className="text-[13px] font-bold uppercase leading-none tracking-[0.16em] text-foreground/55 [font-family:var(--font-dm-sans)] 380:text-[14px] 480:text-[16px] sm:text-[17px]">
        {displayLabel}
      </span>
    </div>
  );
}
