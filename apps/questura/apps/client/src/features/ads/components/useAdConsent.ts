'use client'

import { useSyncExternalStore } from 'react'

import {
  createAdConsentStore,
  type AdConsentChoice,
  type AdConsentState,
  type AdConsentStore,
} from '../lib/adConsent'
import { ADS_LIVE, AD_FRAME_ORIGIN } from '../lib/adUnits'

/**
 * The visitor's ad consent, shared by every ad slot, the notice and the
 * privacy page (`lib/adConsent.ts` explains the rules). One store per page.
 */

let store: AdConsentStore | null = null

function safeStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return window[kind]
  } catch {
    return null
  }
}

/** `?adcountry=FR` in development shows the notice without leaving the country. */
function regionUrl(): string {
  const base = `${AD_FRAME_ORIGIN}/region`
  if (process.env.NODE_ENV === 'production') return base
  const forced = new URLSearchParams(window.location.search).get('adcountry')
  return forced ? `${base}?country=${encodeURIComponent(forced)}` : base
}

function getStore(): AdConsentStore {
  if (store) return store
  store = createAdConsentStore({
    local: safeStorage('localStorage'),
    session: safeStorage('sessionStorage'),
    async fetchConsentRequired() {
      const response = await fetch(regionUrl(), { credentials: 'omit', cache: 'no-store' })
      if (!response.ok) throw new Error(`region ${response.status}`)
      const body = (await response.json()) as { consentRequired?: unknown }
      return body.consentRequired !== false
    },
    markDocument(choice) {
      if (choice === 'denied') document.documentElement.dataset.adConsent = 'denied'
      else delete document.documentElement.dataset.adConsent
    },
  })
  return store
}

const NO_ADS: AdConsentState = 'not-required'
const noop = () => () => {}

export function useAdConsent(): AdConsentState {
  return useSyncExternalStore(
    ADS_LIVE ? (listener) => getStore().subscribe(listener) : noop,
    () => (ADS_LIVE ? getStore().getSnapshot() : NO_ADS),
    () => 'pending',
  )
}

export function chooseAdConsent(choice: AdConsentChoice): void {
  getStore().choose(choice)
}

export function resetAdConsent(): void {
  getStore().reset()
}
