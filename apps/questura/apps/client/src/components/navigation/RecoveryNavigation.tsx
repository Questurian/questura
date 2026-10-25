"use client";

import Navbar from '@/features/Navigation/Navbar';
import { ClientInteractionProvider } from '@/components/providers/ClientInteractionProvider';
import type { LocationMenuResponse } from '@/features/Navigation/lib/fetchLocationMenu';

export default function RecoveryNavigation({ locationMenu }: { locationMenu: LocationMenuResponse | null }) {
  return <ClientInteractionProvider locationMenu={locationMenu}><Navbar /></ClientInteractionProvider>;
}
