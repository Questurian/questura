/**
 * The sign-in form's visual language, shared by both steps and the password
 * reset modal. It follows the newsletter form (NewsletterSignupForm): fields on
 * the page ground held by a hairline, the blue accent for the one action, and
 * #B42318 for errors. Every control is the same 48px tall and full width, so
 * the column has one left edge and one right edge from the title down.
 */

import { ArrowLeft } from 'lucide-react';
import GoogleSignInButton from '../google/GoogleSignInButton';

const authCard =
  'w-full max-w-[460px] rounded-[3px] bg-background px-6 pb-8 font-[family-name:var(--font-dm-sans)] text-foreground ring-1 ring-foreground/10 480:px-10 480:pb-10';

/** The card the sign-in and reset-password modals share. Its top padding is
 *  shorter than its sides because the Back row's 32px box carries air of its
 *  own above the arrow. */
export const authModalPanel = `${authCard} pointer-events-auto pt-5 shadow-[0_24px_48px_-12px_rgb(26_26_26/0.35)] 480:pt-7`;

/** The same card standing on a page (the reset link's landing page). */
export const authPagePanel = `${authCard} pt-8 480:pt-10`;

/** Narrow screens: a sheet near the top, clear of the keyboard. From 480px: a
 *  card centred in the window. Clicks outside the card fall through to the
 *  backdrop underneath. */
export const authModalPlacement =
  'pointer-events-none relative flex min-h-full items-start justify-center px-4 py-4 480:items-center 480:px-6 480:py-10';

// The -0.03em pulls round capitals (S, C) back onto the content edge: Playfair
// sets them ~0.06em inside their box, which reads as an indent at 32px.
export const authModalTitle =
  '-ml-[0.03em] font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.01em] text-foreground 480:text-[2rem]';

export const authModalSubtitle = 'mt-3 text-[0.95rem] leading-relaxed text-foreground/70';

/** The modal's top-left way back. The arrow's ink, not its 16px box, sits on
 *  the content edge: lucide's arrow starts 2.67px into its box. */
export function AuthBackButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-[2.67px] inline-flex h-8 items-center gap-1.5 text-[0.875rem] font-medium leading-none text-foreground/65 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4 focus-visible:outline-none"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </button>
  );
}

export const authLabel = 'block text-[0.85rem] font-medium leading-none text-foreground';

export function authInput(hasError = false) {
  return `block h-12 w-full rounded-[3px] border bg-background px-3.5 text-[0.95rem] text-foreground placeholder:text-foreground/40 transition-colors focus:outline-none focus:ring-1 disabled:opacity-60 ${
    hasError
      ? 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]'
      : 'border-foreground/25 focus:border-accent focus:ring-accent'
  }`;
}

export const authPrimaryButton =
  'flex h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-accent px-4 text-[0.95rem] font-semibold text-white transition-colors hover:bg-[#3451C7] active:bg-[#2F44B0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:hover:bg-accent motion-reduce:transition-none';

export const authFieldError = 'mt-2 text-[0.85rem] leading-snug text-[#B42318]';

/** A text button that sits inside a field's right padding (Show, Edit). The
 *  2px top padding drops DM Sans's caps onto the field's centre line; centred
 *  by box alone they ride ~1px high. */
export const authInlineAction =
  'absolute inset-y-0 right-0 flex items-center px-3.5 pt-[2px] text-[0.85rem] font-medium text-foreground/60 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none';

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
    />
  );
}

/**
 * A notice above the form: a failed sign-in, or why the modal opened (a Google
 * sign-in that came back with an error). Ruled in the gutter rather than boxed,
 * like the editorial blocks.
 */
export function AuthNotice({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div
      role="alert"
      className="border-l-2 border-[#B42318] bg-[#B42318]/[0.06] py-3 pl-3.5 pr-4 text-[0.875rem] leading-snug text-[#B42318]"
    >
      {messages.map((message, index) => (
        <p key={index} className={index > 0 ? 'mt-1.5' : undefined}>
          {message}
        </p>
      ))}
    </div>
  );
}

/** "or", then the Google button. Both steps end with it. */
export function OrContinueWithGoogle() {
  return (
    <div>
      <div className="flex items-center gap-3 py-1">
        <span aria-hidden="true" className="h-px flex-1 bg-foreground/15" />
        <span className="text-[0.75rem] font-medium uppercase leading-none tracking-[0.08em] text-foreground/55">
          or
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-foreground/15" />
      </div>
      <GoogleSignInButton className="mt-5 w-full">Continue with Google</GoogleSignInButton>
    </div>
  );
}
