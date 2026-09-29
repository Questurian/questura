import type { Metadata } from 'next'

import { SectionPage } from '@/features/sections/SectionPage'

export const metadata: Metadata = {
  title: 'Newsletters — Questurian',
  description: 'Questurian newsletters.',
  alternates: { canonical: '/newsletters' },
}

export default function NewslettersPage() {
  return <SectionPage title="Newsletters" />
}
