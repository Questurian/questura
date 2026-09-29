import type { Metadata } from 'next'

import { SectionPage } from '@/features/sections/SectionPage'

export const metadata: Metadata = {
  title: 'Eat — Questurian',
  description: 'Where to eat, from Questurian.',
  alternates: { canonical: '/eat' },
}

export default function EatPage() {
  return <SectionPage title="Eat" />
}
