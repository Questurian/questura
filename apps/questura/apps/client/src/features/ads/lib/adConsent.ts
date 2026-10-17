/**
 * Asking EU/EEA/UK/Swiss visitors before ads load (owner decision 2026-10-17:
 * "ask EU/UK visitors first").
 *
 * Adsterra may set cookies to choose and count ads. In these places the law
 * wants the visitor's yes first, so for them no ad frame loads until they tap
 * "Allow ads". "No thanks" hides every ad slot and is remembered. Everyone else
 * gets ads with nothing to answer.
 *
 * Where the visitor is comes from the ad frame origin (`/region` in
 * `adFrameResponse`), which reads Cloudflare's own country lookup: the pages
 * themselves are cached for everyone and cannot know. The answer is kept for
 * the browser session; the choice is kept until changed (privacy page).
 *
 * Dependency-free so node:test can import it.
 */

/** EU 27, the rest of the EEA, the UK and Switzerland, as ISO 3166-1 alpha-2. */
export const CONSENT_COUNTRIES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'GB', 'CH',
])

/**
 * Whether a visitor from `country` must be asked. An unknown or anonymised
 * country (no lookup, Tor's `T1`, Cloudflare's `XX`) is asked too: asking
 * someone who did not need it costs a tap, not asking someone who did is the
 * failure this exists to prevent.
 */
export function consentRequiredFor(country: string | null | undefined): boolean {
  if (!country) return true
  const code = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return true
  return CONSENT_COUNTRIES.has(code)
}

export type AdConsentChoice = 'granted' | 'denied'

/** localStorage: the visitor's answer. */
export const AD_CONSENT_KEY = 'qv-ad-consent'
/** sessionStorage: whether this visitor has to be asked. */
export const AD_REGION_KEY = 'qv-ad-region'

type ChoiceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function readChoice(storage: ChoiceStorage | null): AdConsentChoice | null {
  try {
    const value = storage?.getItem(AD_CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function writeChoice(choice: AdConsentChoice | null, storage: ChoiceStorage | null): void {
  try {
    if (choice) storage?.setItem(AD_CONSENT_KEY, choice)
    else storage?.removeItem(AD_CONSENT_KEY)
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
}

/**
 * Runs in `<head>` before first paint, so a visitor who said no never sees the
 * empty ad slots flash in: `html[data-ad-consent="denied"] [data-ad-slot]` is
 * hidden by CSS (foundations.css). Keep it in step with `readChoice`.
 */
export const AD_CONSENT_SCRIPT = `try{if(localStorage.getItem("${AD_CONSENT_KEY}")==="denied")document.documentElement.dataset.adConsent="denied"}catch(e){}`

/**
 * Where the visitor stands, for the ad slots and the notice.
 *
 * - `pending`: not known yet (server render, hydration, the region check).
 * - `ask`: must be asked and has not answered. The notice shows; no ad loads.
 * - `granted` / `denied`: answered.
 * - `not-required`: outside the consent countries. Ads load, no notice.
 */
export type AdConsentState = 'pending' | 'ask' | 'granted' | 'denied' | 'not-required'

export function adsMayLoad(state: AdConsentState): boolean {
  return state === 'granted' || state === 'not-required'
}

export type AdConsentDeps = {
  local: ChoiceStorage | null
  session: Pick<Storage, 'getItem' | 'setItem'> | null
  /** True when the visitor must be asked. Throws when the check fails. */
  fetchConsentRequired: () => Promise<boolean>
  /** Mirrors the choice onto <html> for the slot-hiding CSS. */
  markDocument: (choice: AdConsentChoice | null) => void
}

/**
 * The one shared answer every slot and the notice read (an external store for
 * `useSyncExternalStore`). Resolves once, on first subscribe.
 */
export function createAdConsentStore(deps: AdConsentDeps) {
  let state: AdConsentState = 'pending'
  let started = false
  const listeners = new Set<() => void>()

  const set = (next: AdConsentState) => {
    if (next === state) return
    state = next
    for (const listener of listeners) listener()
  }

  const resolve = async () => {
    const stored = readChoice(deps.local)
    if (stored) return set(stored)

    let cached: string | null = null
    try {
      cached = deps.session?.getItem(AD_REGION_KEY) ?? null
    } catch {
      cached = null
    }
    if (cached === 'not-required') return set('not-required')
    if (cached === 'required') return set('ask')

    let required = true
    try {
      required = await deps.fetchConsentRequired()
      try {
        deps.session?.setItem(AD_REGION_KEY, required ? 'required' : 'not-required')
      } catch {
        // Not cached: asked again next page.
      }
    } catch {
      // Could not tell where the visitor is: ask, the safe side.
      required = true
    }
    // An answer given while the check was in flight wins.
    if (state === 'pending') set(required ? 'ask' : 'not-required')
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (!started) {
        started = true
        void resolve()
      }
      return () => listeners.delete(listener)
    },
    choose(choice: AdConsentChoice) {
      writeChoice(choice, deps.local)
      deps.markDocument(choice)
      set(choice)
    },
    /** Forget the answer and ask again (privacy page). */
    reset() {
      writeChoice(null, deps.local)
      deps.markDocument(null)
      set('ask')
    },
  }
}

export type AdConsentStore = ReturnType<typeof createAdConsentStore>
