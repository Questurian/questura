'use client'

import { lazy, Suspense } from 'react'

// Its own chunk, like WebVitals: no page's first load pays for it, and a
// failed download never replaces the page with an error.
const Recorder = lazy(() => import('./JourneyRecorder')
  .then((module) => ({ default: module.JourneyRecorder }))
  .catch(() => ({ default: () => null })))

export function Journey() {
  return <Suspense fallback={null}><Recorder /></Suspense>
}
