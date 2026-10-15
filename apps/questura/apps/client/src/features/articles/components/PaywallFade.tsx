/**
 * Dissolves the tail of the sample into the page ground. Positioned by the
 * caller; the solid end is the bottom edge.
 *
 * Its own file, apart from `PaywallNotice`, so a client page that only needs
 * the fade does not ship the notice. The maps listicle renders the notice on
 * the server and is over its first-load JS budget (perf/budgets.json).
 */
export function PaywallFade({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-10 ${className}`}
      style={{
        background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 45%, transparent) 35%, color-mix(in srgb, var(--background) 85%, transparent) 70%, var(--background) 100%)',
      }}
    />
  )
}
