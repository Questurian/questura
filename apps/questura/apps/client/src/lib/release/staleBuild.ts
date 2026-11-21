/**
 * A page left over from the previous deploy.
 *
 * Every deploy publishes the build files under `/_next/static/` with new names
 * and deletes the old ones (Workers static assets keep one set). A page loaded
 * before the deploy (a tab left open, a tab the phone restores, the back
 * button) still asks for the old names, so the first time it needs code it has
 * not loaded yet, the request is a 404 and the error boundary takes the page.
 * Seen on live 2026-11-21: after a deploy, the previous build's stylesheet and
 * a script chunk both answered 404.
 *
 * A fresh load fixes it, because the new page names the new files. So the
 * boundaries do that load themselves, once. The guard is per tab: a second
 * missing file within RELOAD_WINDOW_MS is a real fault, not an old page, and
 * gets the error page instead of a reload loop.
 *
 * Browsers also keep the old files they already have (`public/_headers` marks
 * `/_next/static/*` immutable), so an old page usually only needs this when it
 * reaches for code it never loaded.
 */

export const RELOAD_KEY = 'questura:stale-build-reload';
export const RELOAD_WINDOW_MS = 30_000;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

// webpack: ChunkLoadError "Loading chunk 123 failed." and "Loading CSS chunk
// 123 failed."; Turbopack: "Failed to load chunk …"; native import():
// Chrome, Safari and Firefox each word it differently.
const MISSING_FILE = [
  /Loading (CSS )?chunk [^\s]+ failed/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export function isMissingBuildFile(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  return typeof message === 'string' && MISSING_FILE.some((pattern) => pattern.test(message));
}

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * True when this error is a missing build file and this tab has not just
 * reloaded for one. Without storage (private mode that refuses it, the
 * server) it answers false: no guard means no reload, never a loop.
 */
export function shouldReloadForStaleBuild(
  error: unknown,
  storage: Storage | null = tabStorage(),
  now: number = Date.now(),
): boolean {
  if (!storage || !isMissingBuildFile(error)) return false;
  try {
    const last = Number(storage.getItem(RELOAD_KEY));
    return !(last > 0 && now - last < RELOAD_WINDOW_MS);
  } catch {
    return false;
  }
}

export function reloadForStaleBuild(
  storage: Storage | null = tabStorage(),
  now: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): void {
  if (!storage) return;
  try {
    storage.setItem(RELOAD_KEY, String(now));
  } catch {
    return;
  }
  reload();
}
