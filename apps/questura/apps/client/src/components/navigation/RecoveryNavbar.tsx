"use client";

import { lazy, Suspense } from 'react';
import type { LocationMenuResponse } from '@/features/Navigation/lib/fetchLocationMenu';

const Navigation = lazy(() => import('./RecoveryNavigation'));

/** Stream the full navigation without making its controls an initial dependency of every route. */
export function RecoveryNavbar({ locationMenu }: { locationMenu: LocationMenuResponse | null }) {
  return <Suspense fallback={null}><Navigation locationMenu={locationMenu} /></Suspense>;
}
