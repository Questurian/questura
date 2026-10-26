"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { InfiniteResultList as ResultList } from "./InfiniteResultListContent";
const Content = lazy(() => import("./InfiniteResultListContent").then((module) => ({ default: module.InfiniteResultList })));

/** The server still renders results; empty searches need no list machinery. */
export function InfiniteResultList(props: ComponentProps<typeof ResultList>) {
  return <Suspense fallback={null}><Content {...props} /></Suspense>;
}
