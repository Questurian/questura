'use client'

import { useRouter } from 'next/navigation'
import { SuspenseBoundary } from '@/components/shared/SuspenseBoundary'
import { useProtectedRoute } from '@/lib/routing'
import { useLoginModalStore } from '@/lib/stores/loginModalStore'
import { useOAuthErrorModal } from '../hooks/useOAuthErrorModal'
import type { CityDashboardProps } from '../types'

function CityDashboardContent({ citySlug, countrySlug }: CityDashboardProps) {
  const router = useRouter()
  const openLoginModal = useLoginModalStore((state) => state.openLoginModal)
  useProtectedRoute({
    onLoginRequired: (redirectPath) => {
      openLoginModal({
        title: 'Sign in required',
        subtitle: 'Please sign in to access your account',
        onSuccess: () => router.push(redirectPath),
      })
    },
  })

  useOAuthErrorModal(countrySlug, citySlug)

  return null
}

export function CityDashboardPage({ citySlug, countrySlug }: CityDashboardProps) {
  return (
    <SuspenseBoundary fallback={null}>
      <CityDashboardContent citySlug={citySlug} countrySlug={countrySlug} />
    </SuspenseBoundary>
  )
}
