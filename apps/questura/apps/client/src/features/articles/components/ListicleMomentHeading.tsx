import "server-only";
import type { JSX } from "react";
import { Playfair_Display } from "next/font/google";
import {
  groupListicleItemsByMoment,
  listicleMomentHeadingId,
} from "@/features/articles/lib/listicleMomentGroups";

/**
 * Playfair at 900 for the section heading only. The root layout loads the
 * family up to 700; declaring the black cut here means next/font preloads it
 * on the routes that render a listicle, not on every page.
 */
const playfairBlack = Playfair_Display({ weight: "900", subsets: ["latin"], display: "swap" });

/**
 * Heading copy for every single-type listicle moment. Mirrors
 * `LISTICLE_MOMENT_OPTIONS` on the server; an unknown value renders no heading.
 */
const MOMENT_LABELS: Record<string, string> = {
  "with-a-view": "With a view",
  rooftop: "Rooftops",
  "by-the-water": "By the water",
  "on-a-budget": "On a budget",
  splurge: "Worth the splurge",
  "date-night": "Date night",
  "local-favorite": "Local favorites",
  "hidden-gem": "Hidden gems",
  "family-friendly": "Family-friendly",
  "big-groups": "Big groups",
  wellness: "Wellness & spas",
  shows: "Shows & performances",
  "fine-dining": "Fine dining",
  "special-occasion": "Special occasion",
  "tasting-menu": "Tasting menus",
  "chef-driven": "Chef-driven",
  "old-school-classic": "Old-school classics",
  "new-and-buzzy": "New & buzzy",
  "quick-lunch": "Quick lunch",
  "street-food": "Street food",
  "markets-food-halls": "Markets & food halls",
  casual: "Casual & laid-back",
  breakfast: "Breakfast",
  brunch: "Brunch",
  coffee: "Coffee & cafés",
  bakeries: "Bakeries",
  sweets: "Sweets & desserts",
  seafood: "Seafood",
  grill: "Grill & meat",
  pizza: "Pizza",
  "noodles-soups": "Noodles & soups",
  "plant-based": "Plant-based",
  healthy: "Healthy & fresh",
  "outdoor-seating": "Outdoor seating",
  "late-night-eats": "Late-night eats",
  "laptop-friendly": "Laptop-friendly",
  "wine-lovers": "Wine lovers",
  "big-loud-venues": "Big, loud venues",
  "live-bands": "Live bands",
  "live-music": "Live music",
  "house-techno": "House & techno",
  "dj-sets": "DJ sets",
  "latin-nights": "Salsa & Latin",
  "jazz-blues": "Jazz & blues",
  karaoke: "Karaoke",
  "dance-floors": "Dance floors",
  "local-hotspot": "Local hotspots",
  "cocktail-bars": "Cocktail bars",
  "wine-bars": "Wine bars",
  "craft-beer": "Craft beer",
  "dive-bars": "Dive bars",
  speakeasies: "Speakeasies",
  "chill-lounges": "Chill lounges",
  "lgbtq-friendly": "LGBTQ+ friendly",
  "after-hours": "After hours",
  "early-evening": "Early evening",
  "sports-bars": "Sports bars",
  "games-bars": "Bars with games",
  "must-see": "Must-see",
  museums: "Museums",
  history: "History",
  "art-galleries": "Art & galleries",
  architecture: "Architecture",
  "sacred-sites": "Churches & temples",
  "parks-gardens": "Parks & gardens",
  nature: "Nature",
  beaches: "Beaches",
  markets: "Markets",
  shopping: "Shopping",
  free: "Free to visit",
  "rainy-day": "Rainy-day picks",
  adventure: "Adventure",
  "on-the-water": "On the water",
  "day-trips": "Day trips",
  tours: "Tours",
  walks: "Walks",
  "photo-spots": "Photo spots",
  "sunset-spots": "Sunset spots",
  luxury: "Luxury",
  boutique: "Boutique",
  "design-hotels": "Design hotels",
  "historic-stays": "Historic stays",
  "good-value": "Good value",
  hostels: "Hostels",
  apartments: "Apartments & rentals",
  romantic: "Romantic",
  beachfront: "Beachfront",
  "with-a-pool": "With a pool",
  central: "Right in the center",
  "quiet-escape": "Quiet escapes",
  "eco-stays": "Eco stays",
  "pet-friendly": "Pet-friendly",
  "adults-only": "Adults only",
  "all-inclusive": "All-inclusive",
  "long-stays": "Long stays",
  "remote-work": "Good for remote work",
  "near-airport": "Near the airport",
  business: "Business trips",
  "locals-rooftops": "The It List",
  "party-rooftops": "After dark",
};

function hasListicleMoment(moment: string | null | undefined): boolean {
  return typeof moment === "string" && Object.hasOwn(MOMENT_LABELS, moment);
}

/**
 * Opens a group of places in a single-type listicle: the label in heavy
 * Playfair capitals, centred between two double accent rules that run to the
 * column edges (owner, 2026-11-15). Labels are kept to 12 characters so the
 * heading stays on one line on a phone; the studio only offers those.
 */
export function ListicleMomentHeading({
  moment,
  id,
}: {
  moment: string;
  id?: string;
}): JSX.Element | null {
  if (!hasListicleMoment(moment)) return null;
  const label = MOMENT_LABELS[moment];
  const rule =
    "h-[7px] min-w-[18px] flex-1 border-y-2 border-accent sm:h-[8px] sm:min-w-6 sm:border-y-[2.5px]";

  return (
    <h2
      id={id}
      className="m-0 flex items-center gap-3 text-foreground"
    >
      <span aria-hidden className={rule} />
      <span className={`${playfairBlack.className} min-w-0 text-center text-[clamp(18px,4.6vw,26px)] font-black uppercase leading-[1.05] tracking-[0.01em] [text-wrap:balance]`}>
        {label}
      </span>
      <span aria-hidden className={rule} />
    </h2>
  );
}

/** Rendered moment headings, keyed by the zero-based start of the run each opens. */
export type ListicleMomentHeadings = Readonly<Record<number, JSX.Element>>;

/**
 * Renders every moment heading a listicle needs. Call it from a server
 * component and pass the result down: the listicle page renders inside a
 * client layout, and the full label table would otherwise ship in the route's
 * first-load JS. `server-only` above fails the build if that happens.
 */
export function renderListicleMomentHeadings(
  items: readonly { moment?: string | null }[],
): ListicleMomentHeadings {
  const headings: Record<number, JSX.Element> = {};
  for (const run of groupListicleItemsByMoment(items)) {
    if (!run.moment || !hasListicleMoment(run.moment)) continue;
    headings[run.start] = (
      <ListicleMomentHeading
        id={listicleMomentHeadingId(run.start)}
        moment={run.moment}
      />
    );
  }
  return headings;
}

/**
 * One heading for every moment there is, for the studio preview: its list
 * changes in the browser, where the label table is not shipped, so the server
 * renders them all once and the page picks.
 */
export function renderEveryListicleMomentHeading(): Readonly<Record<string, JSX.Element>> {
  return Object.fromEntries(
    Object.keys(MOMENT_LABELS).map((moment) => [moment, <ListicleMomentHeading key={moment} moment={moment} />]),
  );
}
