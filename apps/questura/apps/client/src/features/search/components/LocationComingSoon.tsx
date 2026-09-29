import Link from '@/components/navigation/PublicLink'
import { ArrowRight } from 'lucide-react'

/**
 * Shown on a country or city page that has nothing published yet, so the
 * reader learns the place is on our list instead of landing on a blank page.
 */
export function LocationComingSoon({ place }: { place: string }) {
  return (
    <div data-location-state="coming-soon" className="max-w-xl border-l-2 border-accent pl-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Coming soon</p>
      <p className="mt-3 font-display text-[24px] leading-tight text-foreground 480:text-[28px]">
        Our {place} guides are still being written.
      </p>
      <p className="mt-3 text-[15px] leading-7 text-foreground/65">
        Articles, maps, and itineraries for {place} are on the way. Until then, the rest of
        Questurian is open to explore.
      </p>
      <Link
        href="/search"
        className="group mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-foreground outline-none hover:underline focus-visible:underline underline-offset-4"
      >
        Search all guides
        <ArrowRight
          className="size-4 transition group-hover:translate-x-0.5"
          strokeWidth={1.75}
          aria-hidden
        />
      </Link>
    </div>
  )
}
