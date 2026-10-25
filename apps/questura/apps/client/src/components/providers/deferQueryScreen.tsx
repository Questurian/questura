"use client";
import { lazy, Suspense, useEffect, useSyncExternalStore, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/shared/ui/LoadingSpinner";
import { useNavigationIdentity } from "@/lib/user/hooks/useNavigationIdentity";

const subscribe = () => () => {};

/** Private tools have no personalized SSR output. Load them when usable,
 * keeping their query/form machinery off anonymous content and error routes.
 * Their existing server authorization and mutation code remain unchanged.
 */
export function deferQueryScreen<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
  { requireIdentity = true, redirect = "/account" } = {},
) {
  const Screen = lazy(async () => {
    const [screen, { QueryProvider }] = await Promise.all([load(), import("./QueryProvider")]);
    return { default: (props: Props) => <QueryProvider><screen.default {...props} /></QueryProvider> };
  });
  return function DeferredScreen(props: Props) {
    const router = useRouter();
    const identity = useNavigationIdentity();
    const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
    useEffect(() => {
      if (requireIdentity && !identity.loading && !identity.isAuthenticated) {
        router.push(`/?showLogin=true&redirect=${redirect}`);
      }
    }, [router, identity.loading, identity.isAuthenticated]);
    if (!hydrated || (requireIdentity && identity.loading)) return <LoadingSpinner />;
    if (requireIdentity && !identity.isAuthenticated) return null;
    return <Suspense fallback={<LoadingSpinner />}><Screen {...props} /></Suspense>;
  };
}
