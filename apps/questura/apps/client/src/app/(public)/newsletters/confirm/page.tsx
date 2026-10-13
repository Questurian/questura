import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BlockSection } from '@/features/CityDashboard/components/blocks/BlockSection'
import { NewsletterConfirm } from '@/features/newsletter/components/NewsletterConfirm'

export const metadata: Metadata = {
  title: 'Confirm your subscription — Questurian',
  robots: { index: false, follow: false },
}

export default function NewsletterConfirmPage() {
  return (
    <section className="min-h-[70vh] bg-background text-foreground">
      <BlockSection contentClassName="pt-14 pb-24 768:pt-20">
        <Suspense fallback={null}>
          <NewsletterConfirm />
        </Suspense>
      </BlockSection>
    </section>
  )
}
