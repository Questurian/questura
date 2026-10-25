"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { QuestUrianMapsPreview as Preview } from "./QuestUrianMapsPreviewContent";
const Content = lazy(() => import("./QuestUrianMapsPreviewContent").then((module) => ({ default: module.QuestUrianMapsPreview })));

/** Only a block actually present on this page needs its interactive code. */
export function QuestUrianMapsPreview(props: ComponentProps<typeof Preview>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
