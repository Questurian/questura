import Link from '@/components/navigation/PublicLink'

/** The same words as the paywall beside the list (PaywallNotice). */
const UNLOCK = 'Become a member to unlock'
const HEADLINE = 'See every place on the map.'

/** A map pin standing on rings that spread out from where it lands. */
function PinMark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={`text-accent ${className}`}>
      <ellipse cx="24" cy="40" rx="20" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <ellipse cx="24" cy="40" rx="13" ry="4" fill="none" stroke="currentColor" strokeWidth="1.75" opacity="0.5" />
      <ellipse cx="24" cy="40" rx="6.5" ry="2" fill="currentColor" opacity="0.7" />
      <path d="M24 40C24 40 13 27.5 13 17.5a11 11 0 1 1 22 0C35 27.5 24 40 24 40Z" fill="currentColor" />
      <circle cx="24" cy="17.5" r="4.2" className="fill-background" />
    </svg>
  )
}

/**
 * The way in, as plain as the paywall beside the list (owner decision,
 * 2026-10-19): no count of places -- a short list should not look short --
 * and nothing to read but the offer. A card on desktop; a bar on the phone's
 * split view, at the top of the strip, so the places stay in sight below it.
 */
export function MapJoinCall({ compact, href }: { compact: boolean; href: string }) {
  if (compact) {
    return (
      <div data-map-join="" className="absolute inset-x-0 top-0 z-[4] flex items-center gap-2.5 border-b border-foreground/15 bg-background px-3.5 py-2.5 text-foreground">
        <PinMark className="h-8 w-8 shrink-0" />
        <h2 className="min-w-0 flex-1 text-balance font-display text-[1rem] font-medium leading-tight">{HEADLINE}</h2>
        <Link
          href={href}
          className="inline-flex min-h-[38px] shrink-0 items-center rounded-sm bg-accent px-3.5 font-[family-name:var(--font-dm-sans)] text-[0.84rem] font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Become a member
        </Link>
      </div>
    )
  }

  return (
    <div data-map-join="" className="absolute bottom-10 left-1/2 z-[4] w-[min(400px,calc(100%-40px))] -translate-x-1/2 border border-foreground/10 bg-background px-7 pb-5 pt-5 text-center text-foreground">
      <PinMark className="mx-auto mb-2.5 h-12 w-12" />
      <h2 className="text-balance font-display text-[1.5rem] font-medium leading-[1.15] tracking-[-0.015em]">{HEADLINE}</h2>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-accent px-6 font-[family-name:var(--font-dm-sans)] text-[15px] font-semibold tracking-[0.01em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {UNLOCK}
      </Link>
      <p className="mt-3.5 font-[family-name:var(--font-dm-sans)] text-[13px] leading-relaxed text-foreground/80">
        Already a member?{' '}
        <Link href={href} className="font-semibold text-accent underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  )
}

