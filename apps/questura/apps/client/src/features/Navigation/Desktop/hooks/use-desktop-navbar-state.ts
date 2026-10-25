"use client";

import { useNavigationIdentity } from "@/lib/user/hooks/useNavigationIdentity";

export function useDesktopNavbarState() {
  const { user, loading, isAuthenticated } = useNavigationIdentity();
  const isActive = user?.membership?.active ?? false;
  const shouldShowSubscribe = !isAuthenticated || !isActive;

  return {
    loading,
    isAuthenticated,
    isActive,
    shouldShowSubscribe,
  };
}
