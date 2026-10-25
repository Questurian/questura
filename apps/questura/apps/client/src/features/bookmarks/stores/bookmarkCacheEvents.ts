/** Optional account-cache listeners; public bookmark controls need no query runtime. */
const listeners = new Set<() => void>()
export function onBookmarkWrite(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function notifyBookmarkWrite(): void {
  for (const listener of listeners) listener()
}
