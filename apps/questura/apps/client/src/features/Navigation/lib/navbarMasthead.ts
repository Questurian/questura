import { RESERVED_SLUGS } from "../../../lib/reservedSlugs.ts";

// Top-level routes that are not in RESERVED_SLUGS but are also not a country.
// Keep in step with the folders under src/app.
const NON_LOCATION_SEGMENTS: ReadonlySet<string> = new Set([
  "join",
  "eat",
  "stay",
  "newsletters",
  "purchase",
  "subscription",
  "auth-callback-close",
  "auth-error",
]);

const isNotLocation = (segment: string) => {
  const normalized = segment.toLowerCase();
  return RESERVED_SLUGS.has(normalized) || NON_LOCATION_SEGMENTS.has(normalized);
};

/**
 * Whether a page opens with the big masthead that shrinks into the thin bar
 * as you scroll. Only the home page, a country page (/peru) and a city page
 * (/peru/lima) do; every other page starts, and stays, as the thin bar.
 */
export function showsMasthead(pathname: string): boolean {
  const segments = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  if (segments.length === 0) return true;
  if (segments.length > 2) return false;
  return !segments.some(isNotLocation);
}
