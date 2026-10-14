"use client";

import { useState, type JSX } from "react";
import { useSearchParams } from "next/navigation";

import Link from "@/components/navigation/PublicLink";
import { rateLimitedMessage } from "@/lib/api";
import { confirmNewsletter, type NewsletterConfirmStatus } from "../services/newsletter.service";

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; status: NewsletterConfirmStatus }
  | { kind: "error"; message: string };

const RESULT: Record<NewsletterConfirmStatus, { title: string; body: string }> = {
  confirmed: {
    title: "You're subscribed.",
    body: "The next Questurian newsletter will arrive at the start of the month. Every issue has a one-click unsubscribe link.",
  },
  expired: {
    title: "This link has expired.",
    body: "Confirmation links work for 7 days. Sign up again and we'll send a fresh one.",
  },
  invalid: {
    title: "This link doesn't work.",
    body: "It may have been replaced by a newer email, or copied incompletely. Sign up again and we'll send a fresh link.",
  },
};

/**
 * The page the confirmation email opens. Confirming takes a click here rather
 * than happening when the link is opened, because mail scanners open every
 * link in a message and would otherwise subscribe inboxes on their own.
 */
export function NewsletterConfirm(): JSX.Element {
  // Read in the browser: public pages are pre-built, so the server render
  // never sees the query string.
  const token = useSearchParams()?.get("token") ?? null;
  const [state, setState] = useState<State>(token ? { kind: "idle" } : { kind: "done", status: "invalid" });

  async function confirm() {
    if (!token) return;
    setState({ kind: "working" });
    try {
      setState({ kind: "done", status: await confirmNewsletter(token) });
    } catch (error) {
      setState({ kind: "error", message: rateLimitedMessage(error) ?? "Something went wrong. Please try again." });
    }
  }

  if (state.kind === "done") {
    const result = RESULT[state.status];
    return (
      <div role="status">
        <h1 className="font-display text-[2.4rem] font-medium leading-[1.05] tracking-[-0.02em] text-foreground 768:text-[3.2rem]">
          {result.title}
        </h1>
        <p className="mt-4 max-w-[34rem] font-[family-name:var(--font-editorial-serif)] text-[1.1rem] leading-[1.5] text-foreground/80">
          {result.body}
        </p>
        <p className="mt-8 font-[family-name:var(--font-dm-sans)] text-[0.95rem] font-semibold">
          {state.status === "confirmed" ? (
            <Link href="/" className="text-accent hover:underline">
              Read the latest guides →
            </Link>
          ) : (
            <Link href="/newsletters" className="text-accent hover:underline">
              Sign up again →
            </Link>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[2.4rem] font-medium leading-[1.05] tracking-[-0.02em] text-foreground 768:text-[3.2rem]">
        Confirm your subscription
      </h1>
      <p className="mt-4 max-w-[34rem] font-[family-name:var(--font-editorial-serif)] text-[1.1rem] leading-[1.5] text-foreground/80">
        One click and you&rsquo;ll get the Questurian newsletter once a month: our newest guides, maps and itineraries.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={state.kind === "working"}
        className="mt-8 h-[56px] bg-accent px-8 font-[family-name:var(--font-dm-sans)] text-[0.95rem] font-semibold text-background transition-colors hover:bg-foreground disabled:opacity-60"
      >
        {state.kind === "working" ? "Confirming…" : "Confirm subscription"}
      </button>
      {state.kind === "error" ? (
        <p role="alert" className="mt-4 font-[family-name:var(--font-dm-sans)] text-[0.9rem] font-medium text-[#B42318]">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
