import { ArrowDown } from 'lucide-react'
import type { ReactNode } from 'react'

import type { JoinPhoto } from '../data/photos'
import { JoinImage } from './JoinImage'

/*
 * Every link on /join that leads to the plans.
 *
 * Each starts with a hidden "Membership: ". The reader journey dashboard
 * counts a tap as a buying tap when its words match
 * `member|subscribe|choose|continue|create account|unlock`, and it cuts a
 * label at 80 characters, so the word goes first. The visible words stay in
 * the accessible name (WCAG 2.5.3). Plain `#plans` hrefs keep the page's query
 * (`returnTo`, campaign tags), which the plan buttons carry on to checkout.
 */

function Hidden() {
  return <span className="sr-only">Membership: </span>
}

/** "Get all four days ↓": the one text link at the end of a section. */
export function PlansJump({ children }: { children: ReactNode }) {
  return (
    <a href="#plans" className="jp-jump">
      <Hidden />
      <span className="jp-jump-text">{children}</span>
      <ArrowDown className="jp-icon-20" aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} />
    </a>
  )
}

/** A guide as a row: square photo, title, one line about it. */
export function GuideRow({ photo, title, hook }: { photo: JoinPhoto; title: string; hook: string }) {
  return (
    <a href="#plans" className="jp-row">
      <Hidden />
      <span className="jp-thumb" data-photo-frame>
        <JoinImage photo={photo} sizes="(min-width: 768px) 96px, 72px" frame={1} />
      </span>
      <span className="jp-row-copy">
        <span className="jp-title">{title}</span>
        <span className="jp-meta">{hook}</span>
      </span>
    </a>
  )
}

export function GuideRows({ children }: { children: ReactNode }) {
  return <div className="jp-rows">{children}</div>
}

/** A guide as a photo with its title on it: B's lead cards. */
export function GuideLead({
  photo,
  title,
  hook,
  sizes,
}: {
  photo: JoinPhoto
  title: string
  hook: string
  sizes: string
}) {
  return (
    <a href="#plans" className="jp-lead" data-photo-frame>
      <Hidden />
      <JoinImage photo={photo} sizes={sizes} frame={16 / 10} />
      <span className="jp-lead-copy" data-photo-overlay>
        <span className="jp-lead-title">{title}</span>
        <span className="jp-fine">{hook}</span>
      </span>
    </a>
  )
}

/** A guide as a square photo over its title: B's three-column grids, A's pair. */
export function GuideCard({
  photo,
  title,
  hook,
  sizes,
}: {
  photo: JoinPhoto
  title: string
  hook?: string
  sizes: string
}) {
  return (
    <a href="#plans" className="jp-card">
      <Hidden />
      <span className="jp-card-photo" data-photo-frame>
        <JoinImage photo={photo} sizes={sizes} frame={1} />
      </span>
      <span className={hook ? 'jp-title' : 'jp-small-title'}>{title}</span>
      {hook ? <span className="jp-meta">{hook}</span> : null}
    </a>
  )
}

/** The page's first button. The bottom bar shows once this has scrolled away. */
export function BecomeMember() {
  return (
    <a href="#plans" className="jp-button" data-join-start>
      Become a member
    </a>
  )
}
