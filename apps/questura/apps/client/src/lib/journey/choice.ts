/** What this browser keeps about recording: the random id, the visit, and the off switch (ADR-0020). */

const VIEWER_KEY = 'questurian:journey:viewer'
const VISIT_KEY = 'questurian:journey:visit'
const OFF_KEY = 'questurian:journey:off'
export const JOURNEYS_PATH = '/api/public/journeys'

/** A visit ends after half an hour away. */
export const VISIT_GAP_MS = 30 * 60 * 1000

export type Visit = { id: string; last: number; source: string; campaign: string | null }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function browserSaysNo(nav: object): boolean {
  const { globalPrivacyControl, doNotTrack } = nav as { globalPrivacyControl?: unknown; doNotTrack?: unknown }
  return globalPrivacyControl === true || doNotTrack === '1'
}

/** Storage that cannot be read cannot remember an opt-out, so it counts as off. */
export function isOff(store: Store): boolean {
  try {
    return store.getItem(OFF_KEY) === '1'
  } catch {
    return true
  }
}

export function viewerId(store: Store, newId: () => string): string | null {
  try {
    const kept = store.getItem(VIEWER_KEY)
    if (kept) return kept
    const id = newId()
    store.setItem(VIEWER_KEY, id)
    return id
  } catch {
    return null
  }
}

export function currentVisit(
  store: Store,
  now: number,
  newId: () => string,
  arrival: () => Pick<Visit, 'source' | 'campaign'>,
): Visit {
  try {
    const kept = JSON.parse(store.getItem(VISIT_KEY) ?? 'null') as Visit | null
    if (kept?.id && now - kept.last < VISIT_GAP_MS) return kept
  } catch {
    // Unreadable: a new visit.
  }
  return { id: newId(), last: now, ...arrival() }
}

export function saveVisit(store: Store, visit: Visit, now: number): void {
  try {
    store.setItem(VISIT_KEY, JSON.stringify({ ...visit, last: now }))
  } catch {
    // Not remembered: the next page starts a new visit.
  }
}

/**
 * Off first, so a report already on a timer is not sent after the deletion.
 * The id is kept until the server confirms, so a failed deletion can be retried.
 */
export async function turnOff(store: Store, send: (body: string) => Promise<{ ok: boolean }>): Promise<boolean> {
  try {
    store.setItem(OFF_KEY, '1')
    const id = store.getItem(VIEWER_KEY)
    if (id && !(await send(JSON.stringify({ forget: id }))).ok) return false
    store.removeItem(VIEWER_KEY)
    store.removeItem(VISIT_KEY)
    return true
  } catch {
    return false
  }
}

export function turnOn(store: Store): void {
  try {
    store.removeItem(OFF_KEY)
  } catch {
    // Still off.
  }
}

export function hasRecord(store: Store): boolean {
  try {
    return store.getItem(VIEWER_KEY) !== null
  } catch {
    return false
  }
}
