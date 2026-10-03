'use client'

import { SuspenseBoundary } from '@/components/shared/SuspenseBoundary'
import { SignInPromptFromLink } from '@/features/Auth/components/SignInPromptFromLink'
import { useOAuthErrorModal } from '../hooks/useOAuthErrorModal'
import type { CityDashboardProps } from '../types'

function CityDashboardContent({ citySlug, countrySlug }: CityDashboardProps) {
  useOAuthErrorModal(countrySlug, citySlug)

  return <SignInPromptFromLink />
}

export function CityDashboardPage({ citySlug, countrySlug }: CityDashboardProps) {
  return (
    <SuspenseBoundary fallback={null}>
      <CityDashboardContent citySlug={citySlug} countrySlug={countrySlug} />
    </SuspenseBoundary>
  )
}
