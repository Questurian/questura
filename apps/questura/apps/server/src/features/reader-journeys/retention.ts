import { logger } from '@/shared/utils/logger'

import { journeyPool, pruneJourneys } from './store'

const EVERY_MS = 6 * 60 * 60 * 1000

/**
 * The privacy page promises deletion after 90 days, so it cannot wait for
 * traffic: a timer in the server, like the refresh drain (ADR-0015). Two
 * instances pruning at once is harmless.
 */
export function startJourneyRetention(payload: unknown): void {
  const timers = globalThis as unknown as { __questuraJourneyRetention?: ReturnType<typeof setInterval> }
  if (timers.__questuraJourneyRetention) return

  const run = async () => {
    try {
      await pruneJourneys(journeyPool(payload))
    } catch (error) {
      logger.error('[journeys] retention failed', { error })
    }
  }
  setTimeout(() => void run(), 60_000).unref?.()
  timers.__questuraJourneyRetention = setInterval(() => void run(), EVERY_MS)
  timers.__questuraJourneyRetention.unref?.()
}
