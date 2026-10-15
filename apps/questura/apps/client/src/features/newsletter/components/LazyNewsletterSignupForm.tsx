"use client";

import dynamic from "next/dynamic";
import { useId, type ComponentProps, type JSX } from "react";

import type { NewsletterSignupForm } from "./NewsletterSignupForm";

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
const DynamicNewsletterSignupForm = dynamic(() =>
  import("./NewsletterSignupForm")
    .then((module) => module.NewsletterSignupForm)
    .catch(() => () => null),
);

/**
 * The field ids come from here, outside the chunk. On the server, next/dynamic
 * renders the form as the second of two siblings (`PreloadChunks`, then the
 * form). On the client the form's chunk is not loaded yet when hydration
 * reaches it, so React waits and then replays that step, and the replay drops
 * the "second of two" from the tree position `useId()` hashes. A `useId()`
 * inside the form therefore came out different on the client
 * (`_R_khd9…_-email` server, `_R_4hd9…_-email` client), a hydration warning on
 * every article page. Up here nothing suspends, so the ids match, and each form
 * on a page still gets its own.
 */
export function LazyNewsletterSignupForm(
  props: Omit<ComponentProps<typeof NewsletterSignupForm>, "idPrefix">,
): JSX.Element {
  const idPrefix = useId();
  return <DynamicNewsletterSignupForm {...props} idPrefix={idPrefix} />;
}
