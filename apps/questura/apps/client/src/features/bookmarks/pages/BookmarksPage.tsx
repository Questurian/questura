"use client";
import { deferQueryScreen } from "@/components/providers/deferQueryScreen";
export const BookmarksPage = deferQueryScreen<Record<string, never>>(() => import("./BookmarksScreen").then((module) => ({ default: module.BookmarksPage })), { redirect: "/account/bookmarks" });
