/**
 * The "Advertisement" line over every slot.
 *
 * Not decoration. It is the disclosure, and it stays visible on every slot,
 * article or homepage, so a reader never mistakes an ad for our own content.
 */

const sansClass = 'font-[family-name:var(--font-dm-sans)]'

export function AdLabel({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-center ${sansClass} text-[9px] uppercase tracking-[0.2em] text-foreground/40 ${className}`}
    >
      Advertisement
    </p>
  )
}
