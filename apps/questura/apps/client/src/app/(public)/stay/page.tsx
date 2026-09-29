import type { Metadata } from 'next'

import { SectionPage } from '@/features/sections/SectionPage'

export const metadata: Metadata = {
  title: 'Stay — Questurian',
  description: 'Where to stay, from Questurian.',
  alternates: { canonical: '/stay' },
}

export default function StayPage() {
  return <SectionPage title="Stay" />
}
