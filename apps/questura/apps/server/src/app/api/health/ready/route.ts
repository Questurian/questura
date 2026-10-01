import { NextResponse, type NextRequest } from 'next/server'

import { workerHealth } from '@/features/refresh-outbox/lifecycle'
import { APP_CONFIG } from '@/shared/config'
import { loadIdentityState } from '@/shared/http/load-identity'
import { redisBreaker } from '@/shared/lib/rate-limit-counter'
import { healthDetailAllowed } from '@/shared/observability/health-detail'
import { sampledDatabaseProbe } from '@/shared/observability/health-probe'
import { readinessState } from '@/shared/observability/readiness'
import { releaseSha } from '@/shared/observability/release'

/**
 * Readiness: may this instance be sent traffic right now?
 *
 * Two things have to be true. Initialisation has succeeded, and the database
 * answers. It used to check only the first, so an instance whose database had
 * frozen kept saying "ready" while every request it took hung
 * (readiness:faults, "database down").
 *
 * The database half is `select 1` under its own short limit
 * (`PROBE_TIMEOUT_MS`), and it is **sampled**: one probe per process per
 * `PROBE_TTL_MS`, shared with `/api/health`, however hard a platform polls. A
 * poll storm against a struggling database is the thing sampling exists to
 * prevent (health-probe.ts).
 *
 * 503 until initialisation has succeeded, without probing. A process that is
 * up and retrying is alive and not ready, and a platform that conflates those
 * restarts the instance that was about to recover.
 *
 * `degraded` is capability, not fitness. A transient Redis failure belongs
 * there: public reads still work under local limits, so taking the instance
 * out of rotation would trade a degraded site for no site. A database that
 * does not answer is different: nothing this instance serves works without it.
 *
 * In production the public answer carries only what its readers need
 * (`healthDetailAllowed`): readiness and a coarse reason for Railway and the
 * uptime check, the release SHA for the deploy workflow, the refresh worker's
 * last success and failure times for the uptime check, and `loadIdentity` for
 * `launch:verify`. Timings, the Redis breaker, worker counters and raw error
 * text need the ops secret.
 */

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

/** Public reasons are fixed words; a raw initialisation error can name hosts. */
function publicReason(reason: string | null): string | null {
  if (reason === null) return null
  return reason === 'initialising' || reason === 'database unreachable' ? reason : 'initialisation failed'
}

export async function GET(req: NextRequest) {
  const readiness = readinessState()
  const probe = readiness.ready ? await sampledDatabaseProbe() : null
  const ready = readiness.ready && probe?.ok === true
  // Passive: what the rate limiters last saw, not a probe of its own. An
  // open breaker means the last several Redis calls failed; the limiters are
  // running on their fallback policy, so it is degraded, not unready.
  const redisState = redisBreaker.state()
  const degraded =
    redisState === 'closed' || readiness.degraded.includes('redis') ? readiness.degraded : [...readiness.degraded, 'redis']

  const reason = readiness.reason ?? (probe && !probe.ok ? 'database unreachable' : null)

  if (!healthDetailAllowed(req)) {
    const worker = workerHealth()
    return NextResponse.json(
      {
        ready,
        reason: publicReason(reason),
        readySince: readiness.readySince,
        releaseSha: releaseSha() || 'unknown',
        refreshWorker: {
          claiming: worker.claiming,
          lastSuccessAt: worker.lastSuccessAt,
          lastFailureAt: worker.lastFailureAt,
        },
        loadIdentity: loadIdentityState(),
      },
      { status: ready ? 200 : 503, headers: NO_STORE },
    )
  }

  return NextResponse.json(
    {
      ready,
      reason,
      attempts: readiness.attempts,
      readySince: readiness.readySince,
      degraded,
      database: probe
        ? { reachable: probe.ok, responseTimeMs: probe.responseTimeMs, probeAgeMs: Date.now() - probe.at }
        : null,
      redis: { configured: Boolean(APP_CONFIG.redis.url), breaker: redisState },
      releaseSha: releaseSha() || 'unknown',
      refreshWorker: workerHealth(),
      // `off` unless an approved load test's key is set (decision D3).
      // `launch:verify` fails on anything else, so a forgotten key cannot
      // outlive its window unnoticed.
      loadIdentity: loadIdentityState(),
    },
    { status: ready ? 200 : 503, headers: NO_STORE },
  )
}
