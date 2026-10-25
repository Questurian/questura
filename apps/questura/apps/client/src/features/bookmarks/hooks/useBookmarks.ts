'use client';

import { useCallback, useEffect } from 'react';

import { useLoginModalStore } from '@/lib/stores/loginModalStore';
import { useBookmarkStore } from '../stores/bookmarkStore';
import type { BookmarkRef } from '../types';

/**
 * Bookmark state for one control.
 *
 * Store-backed rather than React Query, because the public shell mounts no
 * QueryClient around page content (see `stores/bookmarkStore.ts`).
 */
export function useBookmark(ref: BookmarkRef) {
  const ensureLoaded = useBookmarkStore((state) => state.ensureLoaded);
  const reload = useBookmarkStore((state) => state.reload);
  const toggleInStore = useBookmarkStore((state) => state.toggle);
  const openLoginModal = useLoginModalStore((state) => state.openLoginModal);

  const isBookmarked = useBookmarkStore((state) => state.refs.has(`${ref.targetType}:${ref.targetId}`));
  const isPending = useBookmarkStore((state) => state.pending.has(`${ref.targetType}:${ref.targetId}`));

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const toggle = useCallback(async () => {
    const next = !isBookmarked;
    const result = await toggleInStore(ref, next);

    if (result === 'unauthenticated') {
      openLoginModal({
        title: 'Save this for later',
        subtitle: 'Sign in and we will add it to your bookmarks.',
        onSuccess: () => {
          // Replay the click that opened the modal. Adding is the only sensible
          // replay: nobody signs in to remove a bookmark they could not have
          // had while signed out.
          void reload().then(() => toggleInStore(ref, true));
        },
      });
    }
  }, [isBookmarked, openLoginModal, ref, reload, toggleInStore]);

  return { isBookmarked, isPending, toggle };
}

/** Count of everything the reader has bookmarked, for the account-page entry point. */
export function useBookmarkCount() {
  const ensureLoaded = useBookmarkStore((state) => state.ensureLoaded);
  const count = useBookmarkStore((state) => state.refs.size);
  const status = useBookmarkStore((state) => state.status);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  // `error` is not loading: the count is unknown, and saying "loading" forever
  // would hide that. The account page shows no count rather than a wrong one.
  return { count, isLoading: status === 'idle' || status === 'loading', isUnknown: status === 'error' };
}
