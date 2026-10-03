'use client'

import { useRouter } from 'next/navigation'
import { useProtectedRoute } from '@/lib/routing'
import { useLoginModalStore } from '@/lib/stores/loginModalStore'

/**
 * Opens the sign-in prompt for `?showLogin=true&redirect=...`, which is where
 * the members' pages (/account, Bookmarks, Change password...) send a
 * signed-out reader, and goes on to `redirect` once they sign in. Every such
 * link points at `/`; the city pages keep it for links from before `/` became
 * its own page.
 *
 * Mounted by those pages, not by the global LoginModalRenderer: that one loads
 * during every page's hydration, and with this in it the signed-in /account
 * e2e test hit React's #418 hydration race twice in four loads (PR #33).
 *
 * Reads search params, so render it inside a Suspense boundary.
 */
export function SignInPromptFromLink() {
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

  return null
}
