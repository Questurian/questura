"use client";

import dynamic from "next/dynamic";

/**
 * The signup form as its own chunk. Every placement sits far down a page that
 * is already near its first-load JavaScript budget (the map and itinerary
 * pages are over the 170 kB cap and may not grow: perf/budgets.json), so the
 * form's code loads after the page works instead of before. The form still
 * renders on the server, so nothing moves when the chunk arrives.
 *
 * If the chunk does not arrive, render nothing instead of throwing: a thrown
 * load reaches `app/error.tsx` and swaps the page for "Something went wrong".
 * Firefox cancels the old page's pending scripts as soon as the next page is
 * requested, so leaving an article quickly cut this chunk off (e2e
 * `errors.spec.ts`, journey 10). Same guard as the modal renderers in
 * `ClientInteractionProvider`.
 */
export const LazyNewsletterSignupForm = dynamic(() =>
  import("./NewsletterSignupForm")
    .then((module) => module.NewsletterSignupForm)
    .catch(() => () => null),
);
