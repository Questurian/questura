import type { MapSnapshotEntry } from "@/features/articles/lib/mapSnapshot";
import type {
  ArticleAuthor,
  ImageAttributionData,
  SeoSection,
} from "@/features/articles/types";
import type {
  ListicleInstagramPost,
  ListicleSelectedPhoto,
  ListicleTourPick,
  ListicleVenue,
  MapsListicleHeader,
} from "./mapsListicle";

export type ItineraryMoment =
  | "breakfast"
  | "coffee"
  | "morning-walk"
  | "remote-work"
  | "coworking-stop"
  | "lunch"
  | "street-food"
  | "sweet-treat"
  | "seafood"
  | "soup"
  | "grill"
  | "bakery"
  | "tasting-menu"
  | "culture"
  | "historic-site"
  | "museum-visit"
  | "landmark"
  | "church"
  | "ruins"
  | "palace"
  | "bridge"
  | "lighthouse"
  | "art-gallery"
  | "street-art"
  | "literary-stop"
  | "guided-tour"
  | "local-market"
  | "shopping"
  | "outdoor"
  | "beach-time"
  | "scenic-viewpoint"
  | "clifftop"
  | "oasis"
  | "wildlife"
  | "wellness-break"
  | "active-adventure"
  | "boat-ride"
  | "pier"
  | "day-trip"
  | "bus-ride"
  | "in-transit"
  | "sunset"
  | "rooftop-stop"
  | "dinner"
  | "cocktails"
  | "drinks"
  | "nightlife";

export type ItineraryVenueBlockType =
  | "itinerary-where-staying"
  | "itinerary-dining"
  | "itinerary-accommodations"
  | "itinerary-attractions"
  | "itinerary-nightlife"
  | "itinerary-key-location";

export type ItineraryStopVenueBlockType = Exclude<
  ItineraryVenueBlockType,
  "itinerary-where-staying"
>;

export type ItineraryVenueBlock = {
  id?: string | null;
  blockName?: string | null;
  blockType: ItineraryVenueBlockType;
  item: ListicleVenue;
  moment?: ItineraryMoment | null;
  momentLabel?: string | null;
  /** Something you do at this place; heads the card instead of the place name. */
  activityTitle?: string | null;
  blurb?: string;
  mediaMode?: "photos" | "instagram" | "both" | "none";
  selectedPhotos?: ListicleSelectedPhoto[] | null;
  selectedInstagramPost?: ListicleInstagramPost | number | string | null;
  /** Operator-curated Tour Picks on attraction stops (ordered, max 4). */
  tours?: ListicleTourPick[] | null;
  /** Practical notes drawn under the stop (ADR 0048). */
  stopNotes?: ItineraryStopNote[] | null;
};

export type ItineraryTourAgencyKeyLocation = {
  id?: string | null;
  source: "existing" | "manual";
  title?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  relatedItem?: {
    relationTo:
      | "dining"
      | "accommodations"
      | "attractions"
      | "nightlife"
      | "key-locations";
    value: number | ListicleVenue;
  } | null;
};

export type ItineraryTourAgencyBlock = {
  id?: string | null;
  blockName?: string | null;
  blockType: "itinerary-tour-agency";
  moment?: ItineraryMoment | null;
  momentLabel?: string | null;
  title: string;
  operator: string;
  /** Stored tier, rendered as ticks by `formatPriceTier`. Legacy rows may still hold ticks. */
  price?: "1" | "2" | "3" | "4" | "$" | "$$" | "$$$" | "$$$$" | null;
  url: string;
  tourDuration: number;
  startingPoint?: {
    label?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  keyLocations?: ItineraryTourAgencyKeyLocation[] | null;
  image?:
    | (ImageAttributionData & {
        url?: string | null;
        alt_text?: string | null;
        mediaSet?: ImageAttributionData | number | null;
      })
    | number
    | null;
  instagramPost?: ListicleInstagramPost | number | string | null;
  blurb?: string;
};

export type ItineraryStopBlock =
  | (ItineraryVenueBlock & { blockType: ItineraryStopVenueBlockType })
  | ItineraryTourAgencyBlock;

export type ItineraryDay = {
  id?: string | null;
  whereStaying?: ItineraryVenueBlock[] | null;
  items?: ItineraryStopBlock[] | null;
};

export type ListicleItineraryArticle = {
  id: number;
  title: string;
  slug: string;
  articleType: "listicle-itinerary";
  publishedAt?: string | null;
  updatedAt?: string;
  author?: ArticleAuthor | null;
  header?: MapsListicleHeader | null;
  dayCount?: number | null;
  itineraryDays?: ItineraryDay[] | null;
  whereStaying?: ItineraryVenueBlock[] | null;
  items?: ItineraryStopBlock[] | null;
  seoSection?: SeoSection;
  /** The saved map picture non-members see, taken in the studio (server `shared/content/mapTeaser.ts`). */
  mapTeaser?: MapSnapshotEntry | null;
};

export function isListicleItineraryArticle(
  doc: unknown,
): doc is ListicleItineraryArticle {
  return (
    typeof doc === "object" &&
    doc !== null &&
    "articleType" in doc &&
    (doc as ListicleItineraryArticle).articleType === "listicle-itinerary"
  );
}

/** A Stop Note (studio ADR 0048): practical information drawn under a stop. */
export type ItineraryStopNote = {
  id?: string;
  label: string;
  icon?: "clock" | "info" | "ticket" | "alert";
  title: string;
  subline?: string;
  body?: string;
  timelineLabel?: string;
  timeline?: Array<{ time: string; text: string }>;
  checklistLabel?: string;
  checklist?: string[];
};
