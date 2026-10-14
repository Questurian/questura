"use client";

import dynamic from "next/dynamic";

/**
 * The signup form as its own chunk. Every placement sits far down a page that
 * is already near its first-load JavaScript budget (the map and itinerary
 * pages are over the 170 kB cap and may not grow: perf/budgets.json), so the
 * form's code loads after the page works instead of before. The form still
 * renders on the server, so nothing moves when the chunk arrives.
 */
export const LazyNewsletterSignupForm = dynamic(() =>
  import("./NewsletterSignupForm").then((module) => module.NewsletterSignupForm),
);
