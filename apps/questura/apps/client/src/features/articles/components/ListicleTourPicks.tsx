import { lazy, Suspense, type ComponentProps } from 'react'
import { renderableTourPicks } from '@/features/articles/lib/listicleTourPicks'
import type { ListicleTourPicks as TourPicks } from './ListicleTourPicksContent'
const Content = lazy(() => import('./ListicleTourPicksContent').then((module) => ({ default: module.ListicleTourPicks })))

/** Entries without bookable tours need no booking-card code. */
export function ListicleTourPicks(props: ComponentProps<typeof TourPicks>) {
  if (renderableTourPicks(props.tours).length === 0) return null
  return <Suspense fallback={null}><Content {...props} /></Suspense>
}
