"use client";
import { lazy, Suspense, useEffect, useState } from "react";

const Reporter = lazy(() => import("./WebVitalsReporter").then((module) => ({ default: module.WebVitals })));

/** Passive observers use buffered entries; attach after the initial render work. */
export function WebVitals() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  return ready ? <Suspense fallback={null}><Reporter /></Suspense> : null;
}
