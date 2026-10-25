'use client'

import { lazy, Suspense } from 'react'

const Reporter = lazy(() => import('./WebVitalsReporter')
  .then((module) => ({ default: module.WebVitals }))
  // Firefox cancels pending scripts on navigation. Passive instrumentation
  // must never replace the page with an error; a new document loads it afresh.
  .catch(() => ({ default: () => null })))

/** Stream and hydrate the reporter immediately; never wait for an idle callback.
 * Its own chunk keeps passive instrumentation apart from navigation work.
 */
export function WebVitals() {
  return <Suspense fallback={null}><Reporter /></Suspense>
}
