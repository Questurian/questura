'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { getBackendUrl } from '@/lib/api/api-config'
import { JOURNEYS_PATH, browserSaysNo, isOff } from '@/lib/journey/choice'
import { isRecordedPath } from '@/lib/journey/describe'
import type { Where } from '@/lib/journey/eligibility'
import { observePage } from '@/lib/journey/observe'

/**
 * How US readers use the site, for the owner (ADR-0019, the privacy page).
 * Production only. Renders nothing, and nothing it does may reach the page.
 */

let where: Promise<Where> | null = null

function whereOnce(): Promise<Where> {
  where ??= fetch('/api/journey/where', { cache: 'no-store' })
    .then((response) => (response.ok ? (response.json() as Promise<Where>) : { record: false as const }))
    .catch(() => {
      where = null
      return { record: false as const }
    })
  return where
}

function send(body: string, leaving: boolean): void {
  const url = `${getBackendUrl().replace(/\/+$/, '')}${JOURNEYS_PATH}`
  // A closing page hands it to the browser, which outlives the page. A string
  // body goes as text/plain, cookies included, so there is no preflight.
  if (leaving && navigator.sendBeacon?.(url, body)) return
  void fetch(url, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'content-type': 'text/plain' },
    body,
  }).catch(() => {})
}

export function JourneyRecorder() {
  const path = usePathname()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !path || !isRecordedPath(path)) return
    try {
      if (navigator.webdriver || browserSaysNo(navigator) || isOff(window.localStorage)) return
      return observePage(path, send, whereOnce())
    } catch {
      // An old browser without randomUUID, or storage refused: not recorded.
    }
  }, [path])

  return null
}
