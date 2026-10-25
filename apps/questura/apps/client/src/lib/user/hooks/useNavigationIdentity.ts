'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { navigationIdentity } from '../currentIdentity'
import type { CurrentPrincipalResponse } from '../types'

/** Navigation reads the same server identity as the gate, without account tools. */
export function useNavigationIdentity() {
  const snapshot = useSyncExternalStore(navigationIdentity.subscribe, navigationIdentity.getSnapshot, navigationIdentity.getServerSnapshot)
  useEffect(() => {
    const focus = () => { if (navigationIdentity.getSnapshot().error) void navigationIdentity.refresh() }
    const online = () => { void navigationIdentity.refresh() }
    window.addEventListener('focus', focus)
    window.addEventListener('online', online)
    return () => { window.removeEventListener('focus', focus); window.removeEventListener('online', online) }
  }, [])
  const response = snapshot.response as CurrentPrincipalResponse | null
  const user = response?.authenticated ? response.principal : null
  return { user, loading: snapshot.loading || (!response && Boolean(snapshot.error)), isAuthenticated: Boolean(user) }
}
