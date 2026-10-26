"use client";
import { useQuery } from "@tanstack/react-query";
import { APIError } from "@/lib/api";
import { queryKeys } from "@/lib/react-query/queryKeys";
import { fetchBookmarkPage } from "../services/bookmarks.service";
import type { BookmarkTargetType } from "../types";

/**
 * The Bookmark list page, which lives under `app/(private)` where
 * the deferred Bookmarks screen mounts its QueryProvider before this hook.
 */
export function useBookmarkPage(page: number, type: BookmarkTargetType | null) {
  return useQuery({
    queryKey: queryKeys.bookmarkPage(page, type),
    queryFn: () => fetchBookmarkPage({ page, pageSize: 20, type: type ?? undefined }),
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status >= 400 && error.status < 500) return false;
      return failureCount < 2;
    },
    staleTime: 30 * 1000,
  });
}

