import { currentVisit, isOff, saveVisit, viewerId } from './choice'
import { campaignOf, fieldLabel, isOwnDetailsPage, sourceOf, tapLabel } from './describe'
import type { Where } from './eligibility'
import { CHECKOUT_EVENT } from './markCheckout'
import { createView, type Kind } from './view'

/**
 * Watches one page view and reports it (ADR-0020). It looks once a second and
 * each report is the whole view so far, so a lost one costs nothing. An in-app
 * browser can be killed without a closing event, so the first half minute
 * (where most leave) reports every three seconds, then every ten.
 */

const TICK_MS = 1000
const REPORT_MS = 10_000
const EARLY_REPORT_MS = 3000
const EARLY_FOR_MS = 30_000
const FIRST_REPORT_MS = 1500
/** Before this the page may still be a short shell, which reads as 100% seen. */
const SCROLL_SETTLE_MS = 1500

const newId = () => crypto.randomUUID()

/**
 * On screen and not covered: the phone's map sheet can lie over the text's
 * paywall. `within` is what may lie on top and still be the thing itself (a
 * plan card's button stretches its hit area over the card's price).
 */
function isSeen(element: Element, within: Element = element): boolean {
  if (!element.getClientRects().length) return false
  const rect = element.getBoundingClientRect()
  const top = Math.max(rect.top, 0)
  const bottom = Math.min(rect.bottom, window.innerHeight)
  if (rect.height <= 0 || bottom - top < Math.min(rect.height / 2, 120)) return false
  const left = Math.max(rect.left, 0)
  const right = Math.min(rect.right, window.innerWidth)
  if (right <= left) return false
  const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
  return !!hit && (within.contains(hit) || hit.contains(element))
}

function onScreen(ownDetails: boolean): Array<{ k: Kind; x: string }> {
  if (ownDetails) return []
  const seen: Array<{ k: Kind; x: string }> = []

  let current: Element | null = null
  for (const heading of document.querySelectorAll('main h2, main h3, article h2, article h3')) {
    if (!heading.getClientRects().length || heading.closest('[data-paywalled], [data-map-join], .aud-lock, [data-membership-pitch], .join-plan-card')) continue
    if (heading.getBoundingClientRect().top <= window.innerHeight / 2) current = heading
  }
  const section = current?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80)
  if (section && !section.includes('@')) seen.push({ k: 'section', x: section })

  if ([...document.querySelectorAll('aside[data-paywalled]')].some((element) => isSeen(element))) seen.push({ k: 'paywall', x: 'Guide paywall' })
  if ([...document.querySelectorAll('[data-map-join]')].some((element) => isSeen(element))) seen.push({ k: 'paywall', x: 'Map paywall' })
  // Pressing Listen without a membership opens its own paywall, on free guides too.
  if ([...document.querySelectorAll('.aud-lock')].some((element) => isSeen(element))) {
    seen.push({ k: 'paywall', x: 'Audio paywall' })
  }
  // A free guide's own ask for the sale (MembershipPitch, which states the price).
  if ([...document.querySelectorAll('[data-membership-pitch]')].some((element) => isSeen(element))) {
    seen.push({ k: 'paywall', x: 'Join box' })
  }
  for (const card of document.querySelectorAll('.join-plan-card')) {
    const amount = card.querySelector('.join-plan-price')
    const name = card.querySelector('.join-plan-name')?.textContent?.trim()
    if (name && amount && isSeen(amount, card)) seen.push({ k: 'price', x: name })
  }
  return seen
}

export function observePage(path: string, send: (body: string, leaving: boolean) => void, where: Promise<Where>): () => void {
  const store = window.localStorage
  const ownDetails = isOwnDetailsPage(path)
  const view = createView(performance.now())
  const viewId = newId()
  const source = sourceOf(document.referrer, navigator.userAgent, window.location.hostname)
  if (source === null) return () => {}
  const visit = currentVisit(store, Date.now(), newId, () => ({ source, campaign: campaignOf(window.location.search) }))

  const startedAt = performance.now()
  let place: Extract<Where, { record: true }> | null = null
  let viewer: string | null = null
  let seq = 0
  let lastSent = ''
  let stopped = false

  function report(leaving = false): void {
    if (!place || !viewer || isOff(store)) return
    const snapshot = view.snapshot()
    const state = JSON.stringify(snapshot)
    if (state === lastSent) return
    lastSent = state
    seq += 1
    saveVisit(store, visit, Date.now())
    const body = JSON.stringify({
      ...snapshot,
      viewerId: viewer,
      visitId: visit.id,
      viewId,
      seq,
      path,
      region: place.region,
      city: place.city,
      source: visit.source,
      campaign: visit.campaign,
      language: navigator.language,
    })
    try {
      send(body, leaving)
    } catch {
      // Passive: the page never notices.
    }
  }

  function measureScroll(): void {
    if (performance.now() - startedAt < SCROLL_SETTLE_MS) return
    const height = document.documentElement.scrollHeight
    if (height > 0) view.scrolled(((window.scrollY + window.innerHeight) / height) * 100)
  }

  const active = () => view.active(performance.now())

  // A box counts once the reader taps it or types in it. Focus alone proves
  // nothing: the purchase page puts the caret in the email box by itself.
  // What is typed is never read.
  const usedBoxes = new Set<string>()
  const onBox = (target: EventTarget | null) => {
    if (ownDetails || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
    const label = fieldLabel(target.type)
    if (!label || usedBoxes.has(label)) return
    usedBoxes.add(label)
    view.add('field', label)
  }

  const onClick = (event: MouseEvent) => {
    active()
    if (ownDetails || !(event.target instanceof Element)) return
    onBox(event.target)
    const target = event.target.closest('a, button, [role="button"]')
    if (target?.closest('[data-map-surface]') && !target.closest('[data-map-join]')) {
      view.add('map', 'A numbered place')
    } else if (target) {
      const text = (target as HTMLElement).innerText || target.getAttribute('aria-label') || ''
      const inContent = !!target.closest('main, article, [data-map-join]') && !target.closest('header nav, [role="dialog"]')
      view.add('tap', tapLabel(text, inContent))
    } else if (event.target.closest('[data-map-surface]')) {
      view.add('map', 'The locked map')
    }
  }

  const onInput = (event: Event) => onBox(event.target)

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      view.tick(performance.now(), true)
      view.add('away')
      report(true)
    } else {
      view.tick(performance.now(), false)
      active()
    }
  }

  const onPageHide = () => {
    view.tick(performance.now(), document.visibilityState === 'visible')
    report(true)
  }
  const onCheckout = () => {
    view.add('checkout')
    report(true)
  }

  const ticker = window.setInterval(() => {
    const visible = document.visibilityState === 'visible'
    if (visible) measureScroll()
    view.tick(performance.now(), visible, visible ? onScreen(ownDetails) : [])
  }, TICK_MS)
  let reportedAt = startedAt
  const reporter = window.setInterval(() => {
    const now = performance.now()
    const every = now - startedAt < EARLY_FOR_MS ? EARLY_REPORT_MS : REPORT_MS
    if (now - reportedAt < every - 100) return
    reportedAt = now
    report()
  }, TICK_MS)
  const first = window.setTimeout(() => report(), FIRST_REPORT_MS)

  const passive = { capture: true, passive: true } as const
  const activity = ['scroll', 'keydown', 'pointerdown', 'pointermove', 'touchmove'] as const
  for (const name of activity) window.addEventListener(name, active, passive)
  window.addEventListener('click', onClick, passive)
  window.addEventListener('input', onInput, passive)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener(CHECKOUT_EVENT, onCheckout)
  document.addEventListener('visibilitychange', onVisibility)

  function stop(): void {
    window.clearInterval(ticker)
    window.clearInterval(reporter)
    window.clearTimeout(first)
    for (const name of activity) window.removeEventListener(name, active, passive)
    window.removeEventListener('click', onClick, passive)
    window.removeEventListener('input', onInput, passive)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener(CHECKOUT_EVENT, onCheckout)
    document.removeEventListener('visibilitychange', onVisibility)
  }

  void where.then((answer) => {
    if (!answer.record) {
      stop()
      return
    }
    // No id is written for someone who is not recorded.
    viewer = viewerId(store, newId)
    if (!viewer) {
      stop()
      return
    }
    place = answer
    saveVisit(store, visit, Date.now())
    // Already gone to another page: still one short view.
    if (stopped) report()
  })

  return () => {
    stopped = true
    view.tick(performance.now(), document.visibilityState === 'visible')
    report()
    stop()
  }
}
