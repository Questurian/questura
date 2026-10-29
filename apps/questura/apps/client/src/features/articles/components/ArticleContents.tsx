'use client'

import type { MouseEvent } from 'react'
import { EditorialBox } from './EditorialBox'
import type { TableOfContentsEntry } from '../types'

/**
 * The Contents box of a long guide: its H2 headings, numbered, each a jump to
 * its section. Built like the other editorial boxes (square paper, blue sans
 * kicker); the lines are ink and take the prose links' pale blue highlight.
 *
 * Plain `#id` links, so the jump works before hydration and the address bar
 * keeps a shareable link. The one thing the script adds: a part a non-member
 * cannot read yet is not on the page, so its link goes to the paywall notice
 * instead of doing nothing.
 */
export function ArticleContents({ entries }: { entries: TableOfContentsEntry[] }) {
  if (entries.length === 0) return null

  const jumpToPaywallWhenLocked = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (document.getElementById(id)) return
    const paywall = document.querySelector<HTMLElement>('[data-paywalled]')
    if (!paywall) return
    event.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const navBottom = document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0
    window.scrollTo({
      top: paywall.getBoundingClientRect().top + window.scrollY - navBottom - 16,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <EditorialBox as="nav" label="Contents" className="article-contents">
      <ol className="font-display text-[17px] leading-[1.5] sm:text-[18px]">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex gap-3 py-1.5">
            <span className="w-6 shrink-0 font-mono text-[14px] leading-[1.85] text-accent tabular-nums sm:text-[15px]">
              {index + 1}
            </span>
            <a
              href={`#${entry.id}`}
              onClick={(event) => jumpToPaywallWhenLocked(event, entry.id)}
              className="article-contents-link text-foreground"
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ol>
    </EditorialBox>
  )
}
