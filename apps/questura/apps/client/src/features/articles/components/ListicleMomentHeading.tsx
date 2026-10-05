import "server-only";
import type { JSX } from "react";
import {
  Armchair,
  Baby,
  BedSingle,
  Beer,
  Bike,
  Binoculars,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Castle,
  ChefHat,
  Church,
  Clock,
  CloudRain,
  Coffee,
  Compass,
  CookingPot,
  Croissant,
  Crown,
  Dices,
  Disc3,
  Dog,
  Drama,
  Droplets,
  Drum,
  Egg,
  Feather,
  Fish,
  Flame,
  Flower2,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  GlassWater,
  Guitar,
  HandPlatter,
  Headphones,
  Heart,
  IceCreamBowl,
  KeyRound,
  Landmark,
  Laptop,
  Leaf,
  Map,
  MapPin,
  MapPinned,
  Martini,
  Mic,
  Moon,
  Mountain,
  Music2,
  Palette,
  PartyPopper,
  Piano,
  PiggyBank,
  Pizza,
  Plane,
  Rainbow,
  Sailboat,
  Salad,
  ScrollText,
  ShoppingBag,
  Sofa,
  Soup,
  Sparkles,
  Speaker,
  Sprout,
  Store,
  Sunset,
  Timer,
  Trees,
  Trophy,
  Umbrella,
  University,
  Users,
  UtensilsCrossed,
  Wallet,
  Waves,
  Wheat,
  Wifi,
  Wine,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  groupListicleItemsByMoment,
  listicleMomentHeadingId,
} from "@/features/articles/lib/listicleMomentGroups";

/**
 * Display copy and icon for every single-type listicle moment. Mirrors
 * `LISTICLE_MOMENT_OPTIONS` on the server; an unknown value renders no heading.
 */
const MOMENT_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  "with-a-view": { label: "With a view", Icon: Binoculars },
  rooftop: { label: "Rooftops", Icon: Building2 },
  "by-the-water": { label: "By the water", Icon: Waves },
  "on-a-budget": { label: "On a budget", Icon: Wallet },
  splurge: { label: "Worth the splurge", Icon: Crown },
  "date-night": { label: "Date night", Icon: Heart },
  "local-favorite": { label: "Local favorites", Icon: MapPin },
  "hidden-gem": { label: "Hidden gems", Icon: Compass },
  "family-friendly": { label: "Family-friendly", Icon: Baby },
  "big-groups": { label: "Big groups", Icon: Users },
  wellness: { label: "Wellness & spas", Icon: Flower2 },
  shows: { label: "Shows & performances", Icon: Drama },
  "fine-dining": { label: "Fine dining", Icon: Gem },
  "special-occasion": { label: "Special occasion", Icon: Sparkles },
  "tasting-menu": { label: "Tasting menus", Icon: HandPlatter },
  "chef-driven": { label: "Chef-driven", Icon: ChefHat },
  "old-school-classic": { label: "Old-school classics", Icon: Clock },
  "new-and-buzzy": { label: "New & buzzy", Icon: Zap },
  "quick-lunch": { label: "Quick lunch", Icon: Timer },
  "street-food": { label: "Street food", Icon: CookingPot },
  "markets-food-halls": { label: "Markets & food halls", Icon: Store },
  casual: { label: "Casual & laid-back", Icon: Sofa },
  breakfast: { label: "Breakfast", Icon: Croissant },
  brunch: { label: "Brunch", Icon: Egg },
  coffee: { label: "Coffee & cafés", Icon: Coffee },
  bakeries: { label: "Bakeries", Icon: Wheat },
  sweets: { label: "Sweets & desserts", Icon: IceCreamBowl },
  seafood: { label: "Seafood", Icon: Fish },
  grill: { label: "Grill & meat", Icon: Flame },
  pizza: { label: "Pizza", Icon: Pizza },
  "noodles-soups": { label: "Noodles & soups", Icon: Soup },
  "plant-based": { label: "Plant-based", Icon: Leaf },
  healthy: { label: "Healthy & fresh", Icon: Salad },
  "outdoor-seating": { label: "Outdoor seating", Icon: Trees },
  "late-night-eats": { label: "Late-night eats", Icon: Moon },
  "laptop-friendly": { label: "Laptop-friendly", Icon: Laptop },
  "wine-lovers": { label: "Wine lovers", Icon: Wine },
  "big-loud-venues": { label: "Big, loud venues", Icon: Speaker },
  "live-bands": { label: "Live bands", Icon: Guitar },
  "live-music": { label: "Live music", Icon: Music2 },
  "house-techno": { label: "House & techno", Icon: Disc3 },
  "dj-sets": { label: "DJ sets", Icon: Headphones },
  "latin-nights": { label: "Salsa & Latin", Icon: Drum },
  "jazz-blues": { label: "Jazz & blues", Icon: Piano },
  karaoke: { label: "Karaoke", Icon: Mic },
  "dance-floors": { label: "Dance floors", Icon: PartyPopper },
  "local-hotspot": { label: "Local hotspots", Icon: Flame },
  "cocktail-bars": { label: "Cocktail bars", Icon: Martini },
  "wine-bars": { label: "Wine bars", Icon: Wine },
  "craft-beer": { label: "Craft beer", Icon: Beer },
  "dive-bars": { label: "Dive bars", Icon: Dices },
  speakeasies: { label: "Speakeasies", Icon: KeyRound },
  "chill-lounges": { label: "Chill lounges", Icon: Armchair },
  "lgbtq-friendly": { label: "LGBTQ+ friendly", Icon: Rainbow },
  "after-hours": { label: "After hours", Icon: Moon },
  "early-evening": { label: "Early evening", Icon: Sunset },
  "sports-bars": { label: "Sports bars", Icon: Trophy },
  "games-bars": { label: "Bars with games", Icon: Gamepad2 },
  "must-see": { label: "Must-see", Icon: Landmark },
  museums: { label: "Museums", Icon: University },
  history: { label: "History", Icon: ScrollText },
  "art-galleries": { label: "Art & galleries", Icon: Palette },
  architecture: { label: "Architecture", Icon: Building },
  "sacred-sites": { label: "Churches & temples", Icon: Church },
  "parks-gardens": { label: "Parks & gardens", Icon: Trees },
  nature: { label: "Nature", Icon: Mountain },
  beaches: { label: "Beaches", Icon: Umbrella },
  markets: { label: "Markets", Icon: Store },
  shopping: { label: "Shopping", Icon: ShoppingBag },
  free: { label: "Free to visit", Icon: Gift },
  "rainy-day": { label: "Rainy-day picks", Icon: CloudRain },
  adventure: { label: "Adventure", Icon: Bike },
  "on-the-water": { label: "On the water", Icon: Sailboat },
  "day-trips": { label: "Day trips", Icon: Car },
  tours: { label: "Tours", Icon: Map },
  walks: { label: "Walks", Icon: Footprints },
  "photo-spots": { label: "Photo spots", Icon: Camera },
  "sunset-spots": { label: "Sunset spots", Icon: Sunset },
  luxury: { label: "Luxury", Icon: Gem },
  boutique: { label: "Boutique", Icon: Sparkles },
  "design-hotels": { label: "Design hotels", Icon: Palette },
  "historic-stays": { label: "Historic stays", Icon: Castle },
  "good-value": { label: "Good value", Icon: PiggyBank },
  hostels: { label: "Hostels", Icon: BedSingle },
  apartments: { label: "Apartments & rentals", Icon: KeyRound },
  romantic: { label: "Romantic", Icon: Heart },
  beachfront: { label: "Beachfront", Icon: Umbrella },
  "with-a-pool": { label: "With a pool", Icon: Droplets },
  central: { label: "Right in the center", Icon: MapPinned },
  "quiet-escape": { label: "Quiet escapes", Icon: Feather },
  "eco-stays": { label: "Eco stays", Icon: Sprout },
  "pet-friendly": { label: "Pet-friendly", Icon: Dog },
  "adults-only": { label: "Adults only", Icon: GlassWater },
  "all-inclusive": { label: "All-inclusive", Icon: UtensilsCrossed },
  "long-stays": { label: "Long stays", Icon: CalendarDays },
  "remote-work": { label: "Good for remote work", Icon: Wifi },
  "near-airport": { label: "Near the airport", Icon: Plane },
  business: { label: "Business trips", Icon: Briefcase },
};

function hasListicleMoment(moment: string | null | undefined): boolean {
  return typeof moment === "string" && Object.hasOwn(MOMENT_CONFIG, moment);
}

/**
 * Opens a group of places in a single-type listicle: accent icon and sans
 * label sitting on a hairline that runs to the column edge.
 */
export function ListicleMomentHeading({
  moment,
  id,
}: {
  moment: string;
  id?: string;
}): JSX.Element | null {
  if (!hasListicleMoment(moment)) return null;
  const { Icon, label } = MOMENT_CONFIG[moment];

  return (
    <h2
      id={id}
      className="m-0 flex items-center gap-2.5 text-accent 380:gap-3 480:gap-3.5 sm:gap-4"
    >
      <Icon
        className="size-[24px] shrink-0 380:size-[26px] 480:size-[29px] sm:size-[32px]"
        strokeWidth={1.6}
        aria-hidden
      />
      <span className="shrink-0 text-[14px] font-bold uppercase leading-none tracking-[0.16em] [font-family:var(--font-dm-sans)] 380:text-[15px] 480:text-[17px] sm:text-[19px]">
        {label}
      </span>
      <span aria-hidden className="h-px min-w-8 flex-1 bg-foreground/18" />
    </h2>
  );
}

/** Rendered moment headings, keyed by the zero-based start of the run each opens. */
export type ListicleMomentHeadings = Readonly<Record<number, JSX.Element>>;

/**
 * Renders every moment heading a listicle needs. Call it from a server
 * component and pass the result down: the listicle page renders inside a
 * client layout, and importing the icon set there adds ~10 kB gzip to the
 * route's first-load JS. `server-only` above fails the build if that happens.
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
