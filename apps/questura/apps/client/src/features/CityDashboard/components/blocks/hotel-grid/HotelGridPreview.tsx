"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { HotelGridPreview as Preview } from "./HotelGridPreviewContent";
const Content = lazy(() => import("./HotelGridPreviewContent").then((module) => ({ default: module.HotelGridPreview })));

/** Only a block actually present on this page needs its interactive code. */
export function HotelGridPreview(props: ComponentProps<typeof Preview>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
