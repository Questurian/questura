/**
 * Where the started Sentry SDK lives, apart from the code that starts it.
 *
 * The logger reports through it (`logged-error-report.ts`) and
 * `error-reporting.ts` imports the logger, so the slot has its own module:
 * neither side has to import the other.
 *
 * The SDK lives on `globalThis`, not in a module variable. Next bundles
 * `instrumentation.ts` (which starts it) separately from each route (which
 * report through it), so each has its own copy of every module; a
 * module-level variable set at boot was still `null` in `/api/client-errors`.
 * Found by running the route against a local ingest, not by a unit test.
 */

type SentryModule = typeof import('@sentry/nextjs')
/** The part of the SDK the server uses, so tests can hand in a fake. */
export type SentryClient = Pick<
  SentryModule,
  'init' | 'withScope' | 'captureRequestError' | 'captureMessage' | 'captureException' | 'flush'
>

const slot = globalThis as unknown as { __questuraSentry?: SentryClient | null }

export const sentrySlot = {
  get client(): SentryClient | null {
    return slot.__questuraSentry ?? null
  },
  set client(value: SentryClient | null) {
    slot.__questuraSentry = value
  },
}
