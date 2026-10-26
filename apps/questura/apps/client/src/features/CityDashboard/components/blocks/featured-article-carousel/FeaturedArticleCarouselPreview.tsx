"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { FeaturedArticleCarouselPreview as Preview } from "./FeaturedArticleCarouselPreviewContent";
const Content = lazy(() => import("./FeaturedArticleCarouselPreviewContent").then((module) => ({ default: module.FeaturedArticleCarouselPreview })));

/** Only a block actually present on this page needs its interactive code. */
export function FeaturedArticleCarouselPreview(props: ComponentProps<typeof Preview>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
