/**
 * The desktop navbar's section links. They show twice: in the row under the
 * masthead, and in the thin bar once it has fully collapsed.
 *
 * None of these pages exists yet, so none has an `href`: each shows as plain
 * text in the navbar, with nothing to click. When a page is ready, give its
 * entry an `href` and it becomes a link in both places.
 */
export interface NavSection {
  label: string;
  href?: string;
  /** Thin bar only: hidden below 1280px, where it doesn't fit beside the wordmark. */
  wideOnly?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { label: "Eat" },
  { label: "Stay" },
  { label: "Itineraries" },
  { label: "Newsletters", wideOnly: true },
];
