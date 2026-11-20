import { LIMA_HREF } from '@/lib/routing/peruLaunch';

/**
 * The desktop navbar's section links. They show twice: in the row under the
 * masthead, and in the thin bar once it has fully collapsed.
 *
 * An entry without an `href` shows as plain text, with nothing to click.
 */
export interface NavSection {
  label: string;
  href?: string;
  /** Thin bar only: hidden below 1280px, where it doesn't fit beside the wordmark. */
  wideOnly?: boolean;
  /**
   * Left out of the thin bar: shows in the row under the big masthead (home,
   * country and city pages) and in the menu, never in the bar you get after
   * scrolling.
   */
  rowOnly?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { label: "Lima", href: LIMA_HREF, rowOnly: true },
  { label: "Eat", href: "/eat" },
  { label: "Stay", href: "/stay" },
  { label: "Itineraries", href: "/itineraries" },
];
