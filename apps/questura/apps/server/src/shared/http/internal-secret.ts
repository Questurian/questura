import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextRequest } from 'next/server'

/**
 * The ops secret the internal routes share (`DB_STATS_SECRET`):
 * `Authorization: Bearer <secret>` or `x-stats-secret`, compared through
 * equal-length digests so a wrong length cannot throw or leak timing.
 */
export function internalSecretMatches(req: NextRequest, configured: string): boolean {
  const providedDigest = createHash('sha256').update(providedSecret(req)).digest()
  const configuredDigest = createHash('sha256').update(configured).digest()
  return timingSafeEqual(providedDigest, configuredDigest)
}

function providedSecret(req: NextRequest): string {
  const bearer = req.headers.get('authorization')
  if (typeof bearer === 'string' && bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim()
  }

  return req.headers.get('x-stats-secret')?.trim() ?? ''
}
