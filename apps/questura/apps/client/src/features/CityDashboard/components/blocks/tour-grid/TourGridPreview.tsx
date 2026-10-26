"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { TourGridPreview as Preview } from "./TourGridPreviewContent";
const Content = lazy(() => import("./TourGridPreviewContent").then((module) => ({ default: module.TourGridPreview })));

/** Only a block actually present on this page needs its interactive code. */
export function TourGridPreview(props: ComponentProps<typeof Preview>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
