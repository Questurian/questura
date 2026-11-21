"use client";

import { lazy, Suspense } from 'react';
import type { LocationMenuResponse } from '@/features/Navigation/lib/fetchLocationMenu';

const Navigation = lazy(() => import('./RecoveryNavigation'));

/**
 * The navbar's height while it loads: 64px, and 147px with the desktop
 * masthead from 1024 up (measured 2026-11-21). With no reserved space the 404
 * text drew first and the navbar then pushed it down.
 */
function NavbarSpace() {
  return <div aria-hidden="true" className="h-16 1024:h-[147px]" />;
}

/** Stream the full navigation without making its controls an initial dependency of every route. */
export function RecoveryNavbar({ locationMenu }: { locationMenu: LocationMenuResponse | null }) {
  return <Suspense fallback={<NavbarSpace />}><Navigation locationMenu={locationMenu} /></Suspense>;
}
