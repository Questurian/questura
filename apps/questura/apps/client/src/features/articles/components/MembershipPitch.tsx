import type { JSX } from 'react'

import Link from '@/components/navigation/PublicLink'
import { EditorialBox } from './EditorialBox'

/**
 * A free article's ask for the sale (owner, 2026-11-22: buys over sign-ups).
 *
 * A square paper box like the column's others, with an underlined line rather
 * than a button. Server-rendered into the cached page for everyone; CSS hides
 * it from members through the navbar's pre-paint `html[data-identity]` hint,
 * so it costs no script and no request.
 *
 * The price is the catalog's (`docs/membership-pricing.md`). Cancelling ends
 * at the period's end, which is what "keep the rest of your month" promises.
 */
export function MembershipPitch({ path }: { path: string }): JSX.Element {
  return (
    <EditorialBox label="Going on this trip?" className="[html[data-identity=member]_&]:hidden">
      <div data-membership-pitch>
        <p className="font-display text-[22px] font-medium leading-[1.2] tracking-[-0.02em] sm:text-[26px]">
          This guide is free. Members get the rest.
        </p>
        <p className="mt-3 font-display text-[17px] leading-[1.6] text-foreground/80 sm:text-[18px]">
          Every place on our maps, the day-by-day itineraries, the guides linked on this page, and the audio.
        </p>
        <p className="mt-3 font-display text-[17px] italic leading-[1.6] text-foreground/80 sm:text-[18px]">
          $4.99 a month. Just the one trip? Cancel anytime and keep the rest of your month.
        </p>
        <Link
          href={`/join?returnTo=${encodeURIComponent(path)}#plans`}
          className="mt-4 inline-block py-2 font-mono text-[13px] font-bold uppercase tracking-[0.06em] text-accent underline underline-offset-4"
        >
          Unlock everything
        </Link>
      </div>
    </EditorialBox>
  )
}
