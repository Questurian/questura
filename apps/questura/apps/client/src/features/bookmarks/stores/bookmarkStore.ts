import { useStore } from 'zustand';

import { isUnauthenticated } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/react-query';
import { identityStore } from '@/lib/user/currentIdentity';

import { createBookmark, deleteBookmark, fetchBookmarkRefs } from '../services/bookmarks.service';
import { bookmarkRefKey, type BookmarkRef } from '../types';
import { createBookmarkStore, type BookmarkCoreState } from './bookmarkStoreCore';

/**
 * Bookmark state for the public site, held in a module-level store rather than
 * React Query.
 *
 * This is forced by ADR-0003 and is not a preference. `app/(public)/layout.tsx`
 * is `force-static`, and `PublicChrome` mounts `ClientInteractionProvider` —
 * which is where `QueryProvider` lives — around the Navbar *only*, leaving page
 * content outside it. A `useQuery` inside an article page therefore throws "No
 * QueryClient set". Zustand needs no provider, which is why the login and user
 * modals already use it.
 *
 * One store shared by every control on the page means the refs are fetched once
 * per page rather than once per card. The logic — unknown versus signed out,
 * stale responses, recovery — lives in `bookmarkStoreCore.ts`.
 */
/**
 * The Bookmarks page reads its list through React Query, from the one
 * module-level client, and kept a page it had already shown for its whole
 * staleTime. Saving an article and going straight back to the page showed the
 * old list until a refresh. After every write, drop the lists nobody is
 * showing, so the next visit fetches, and refetch the one on screen.
 */
function forgetSavedLists() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks, refetchType: 'active' });
  queryClient.removeQueries({ queryKey: queryKeys.bookmarks, type: 'inactive' });
}

export const bookmarkStore = createBookmarkStore<BookmarkRef>({
  keyOf: bookmarkRefKey,
  fetchRefs: fetchBookmarkRefs,
  create: (ref) => createBookmark(ref).then(forgetSavedLists),
  remove: (ref) => deleteBookmark(ref).then(forgetSavedLists),
  isUnauthorized: isUnauthenticated,
});

type State = BookmarkCoreState<BookmarkRef>;

export function useBookmarkStore<T>(selector: (state: State) => T): T {
  return useStore(bookmarkStore, selector);
}
useBookmarkStore.getState = bookmarkStore.getState;

// Sign-in and sign-out change whose bookmarks these are. Drop the previous
// reader's refs and pending writes, and re-read if any control is showing.
if (typeof window !== 'undefined') {
  identityStore.subscribe(() => {
    void bookmarkStore.getState().resetForNewReader();
  });
}
