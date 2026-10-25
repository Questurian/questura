"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { ThingsToDoAttractionsPreview as Preview } from "./ThingsToDoAttractionsPreviewContent";
const Content = lazy(() => import("./ThingsToDoAttractionsPreviewContent").then((module) => ({ default: module.ThingsToDoAttractionsPreview })));

/** Only a block actually present on this page needs its interactive code. */
export function ThingsToDoAttractionsPreview(props: ComponentProps<typeof Preview>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
