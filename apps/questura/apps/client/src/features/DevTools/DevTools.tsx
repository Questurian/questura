"use client";
import { lazy, Suspense, useSyncExternalStore } from "react";

const DevMembershipSwitcher = process.env.NODE_ENV === "development"
  ? lazy(() => import("./DevMembershipSwitcher"))
  : null;
const subscribe = () => () => {};

/** Local-only controls; neither the switcher nor a dynamic-loader runtime ships. */
export default function DevTools() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return DevMembershipSwitcher && hydrated ? <Suspense fallback={null}><DevMembershipSwitcher /></Suspense> : null;
}
