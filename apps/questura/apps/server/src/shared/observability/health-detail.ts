import type { NextRequest } from 'next/server'

import { internalSecretMatches } from '@/shared/http/internal-secret'

/**
 * Whether a health answer may carry its detail: runtime versions, memory,
 * uptime, database timings, the Redis breaker, refresh-worker counters.
 *
 * None of that is dangerous on its own, but on a public URL it is a free
 * inventory for anyone probing the API (the 2026-10-01 audit called it a
 * recon gift). In production it is shown only to a caller holding the ops
 * secret the internal routes share (`DB_STATS_SECRET`). Outside production it
 * is always shown, because local tooling such as `scripts/auth-smoke.sh` reads
 * it without a secret.
 *
 * The public answer keeps what monitors need: the status, readiness, and the
 * release SHA, which the deploy workflow polls and which is the head of a
 * public repository anyway.
 */
export function healthDetailAllowed(req: Pick<NextRequest, 'headers'>): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const configured = process.env.DB_STATS_SECRET?.trim()
  if (!configured) return false
  return internalSecretMatches(req as NextRequest, configured)
}
