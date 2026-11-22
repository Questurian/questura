'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The bottom "Choose your plan" bar. It shows once the page's first button
 * (`[data-join-start]`) has scrolled away above the screen, and leaves before
 * the plans come up, so it never covers a price or a plan button. Rendered
 * inside `main`, so the journey recorder keeps the words of a tap on it.
 *
 * While it shows, the page's scroll padding grows by its height, so a link
 * reached with the keyboard is scrolled clear of it (WCAG 2.4.11).
 */
export default function PlansBar() {
  const [on, setOn] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const start = document.querySelector('[data-join-start]')
    const plans = document.getElementById('plans')
    if (!start || !plans) return

    let frame = 0
    const update = () => {
      frame = 0
      const height = bar.current?.offsetHeight ?? 0
      const startGone = start.getBoundingClientRect().bottom < 0
      // Leave a bar's height before the plans' top reaches the bar.
      const plansAhead = plans.getBoundingClientRect().top > window.innerHeight + 8
      setOn(startGone && plansAhead)
      document.documentElement.style.setProperty('--jp-bar-space', `${height}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.documentElement.style.removeProperty('--jp-bar-space')
    }
  }, [])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-jp-bar', on)
    return () => document.documentElement.removeAttribute('data-jp-bar')
  }, [on])

  return (
    <div ref={bar} className="jp-bar" data-on={on ? '' : undefined} aria-hidden={on ? undefined : true}>
      <a href="#plans" className="jp-button" tabIndex={on ? undefined : -1}>
        Choose your plan
      </a>
    </div>
  )
}
