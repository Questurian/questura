"use client";

import { useId, useState, type FormEvent, type JSX } from "react";

import Link from "@/components/navigation/PublicLink";
import { rateLimitedMessage, RequestError } from "@/lib/api";
import {
  subscribeToNewsletter,
  type NewsletterSignupSource,
} from "../services/newsletter.service";

type Tone = "dark" | "light";

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

// Loose on purpose, like the server's: the confirmation email is the real check.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TONES: Record<
  Tone,
  { label: string; input: string; button: string; fine: string; link: string; message: string; error: string }
> = {
  dark: {
    label: "text-background",
    input:
      "border-foreground/20 bg-paper text-foreground placeholder-foreground/40 focus:border-foreground",
    button: "bg-foreground text-background hover:bg-black",
    fine: "text-background/65",
    link: "text-background/85 underline underline-offset-2 hover:text-background",
    message: "text-background",
    error: "text-background",
  },
  light: {
    label: "text-foreground",
    input:
      "border-foreground/25 bg-background text-foreground placeholder-foreground/40 focus:border-accent",
    button: "bg-accent text-background hover:bg-foreground",
    fine: "text-foreground/60",
    link: "text-accent underline underline-offset-2 hover:text-foreground",
    message: "text-foreground",
    error: "text-[#B42318]",
  },
};

function errorMessage(error: unknown): string {
  const limited = rateLimitedMessage(error);
  if (limited) return limited;
  if (error instanceof RequestError && (error.status === 400 || error.status === 503)) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * The one newsletter signup form, used by every placement (homepage block,
 * /newsletters, the end of articles). Signup is double opt-in, so success is
 * "check your inbox", never "you're subscribed".
 */
export function NewsletterSignupForm({
  source,
  tone = "light",
  buttonLabel = "Sign up",
}: {
  source: NewsletterSignupSource;
  tone?: Tone;
  buttonLabel?: string;
}): JSX.Element {
  const id = useId();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const t = TONES[tone];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_SHAPE.test(trimmed)) {
      setState({ kind: "error", message: "Please enter a valid email address." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      await subscribeToNewsletter({ email: trimmed, source, website });
      setState({ kind: "sent", email: trimmed });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className={`font-[family-name:var(--font-dm-sans)] ${t.message}`}>
        <p className="text-[1.05rem] font-semibold">Check your inbox.</p>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed opacity-85">
          We sent a link to <span className="break-all font-medium">{state.email}</span>. Click it to
          confirm your subscription.
        </p>
      </div>
    );
  }

  const submitting = state.kind === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor={`${id}-email`}
        className={`block font-[family-name:var(--font-dm-sans)] text-[0.9rem] font-medium ${t.label}`}
      >
        Your email address
      </label>
      {/* Honeypot: hidden from people and screen readers, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-col gap-3 1024:flex-row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.kind === "error" ? true : undefined}
          aria-describedby={state.kind === "error" ? `${id}-error` : undefined}
          className={`h-[56px] w-full min-w-0 border px-4 1024:flex-1 font-[family-name:var(--font-dm-sans)] text-[0.95rem] outline-none ${t.input}`}
        />
        <button
          type="submit"
          disabled={submitting}
          className={`h-[56px] shrink-0 px-8 font-[family-name:var(--font-dm-sans)] text-[0.95rem] font-semibold transition-colors disabled:opacity-60 ${t.button}`}
        >
          {submitting ? "Sending…" : buttonLabel}
        </button>
      </div>
      {state.kind === "error" ? (
        <p
          id={`${id}-error`}
          role="alert"
          className={`mt-3 font-[family-name:var(--font-dm-sans)] text-[0.88rem] font-medium ${t.error}`}
        >
          {state.message}
        </p>
      ) : null}
      <p
        className={`mt-4 max-w-[34rem] font-[family-name:var(--font-dm-sans)] text-[0.75rem] leading-relaxed ${t.fine}`}
      >
        Once a month, free. Unsubscribe anytime.{" "}
        <Link href="/privacy" className={t.link}>
          Privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
