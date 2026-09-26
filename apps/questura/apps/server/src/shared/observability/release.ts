type Env = Record<string, string | undefined>

/**
 * The commit this process was built from, or `undefined` when nothing says.
 *
 * `QUESTURA_RELEASE_SHA` wins when set: the laptop's release scripts set it,
 * and a deliberate value beats an inferred one. Railway sets
 * `RAILWAY_GIT_COMMIT_SHA` on every deploy from GitHub, so the live API reports
 * its commit in health, Sentry and connection names without an extra variable
 * to keep in step. Until 2026-09-26 it said `unknown`.
 */
export function releaseSha(env: Env = process.env): string | undefined {
  return env.QUESTURA_RELEASE_SHA?.trim() || env.RAILWAY_GIT_COMMIT_SHA?.trim() || undefined
}
