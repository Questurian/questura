import type { JourneyReport } from './report'
import type { clientKind } from './client-kind'

/** The journeys' SQL (ADR-0019). Every statement is parameterised. */

export type JourneyPool = {
  query: (sql: string, values?: unknown[]) => Promise<{ rowCount?: number | null }>
}

export const RETENTION_DAYS = 90

export function journeyPool(payload: unknown): JourneyPool {
  const pool = (payload as { db?: { pool?: JourneyPool } }).db?.pool
  if (!pool) throw new Error('Expected Payload db.pool to be available.')
  return pool
}

/*
 * One statement, so a report is one round trip. A report is the whole view so
 * far, so a lost one costs nothing and a late one (lower seq) is ignored. A
 * view id that belongs to another viewer is never written over.
 */
export const RECORD_SQL = `
  WITH viewer AS (
    INSERT INTO journey_viewers AS v
      (id, auth_user_id, region, city, os, browser, device, language, source, campaign)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      last_seen_at = now(),
      auth_user_id = COALESCE(EXCLUDED.auth_user_id, v.auth_user_id),
      region = COALESCE(EXCLUDED.region, v.region),
      city = COALESCE(EXCLUDED.city, v.city)
    RETURNING id
  )
  INSERT INTO journey_views AS p
    (id, viewer_id, visit_id, path, source, campaign, seq, visible_seconds, scroll_percent, events, started_at)
  SELECT $11, viewer.id, $12, $13, $9, $10, $14, $15, $16, $17::jsonb,
         now() - make_interval(secs => LEAST($15::int, 30))
    FROM viewer
  ON CONFLICT (id) DO UPDATE SET
    last_seen_at = now(),
    seq = EXCLUDED.seq,
    visible_seconds = EXCLUDED.visible_seconds,
    scroll_percent = EXCLUDED.scroll_percent,
    events = EXCLUDED.events
  WHERE p.viewer_id = EXCLUDED.viewer_id AND p.seq < EXCLUDED.seq`

export async function recordJourney(
  pool: JourneyPool,
  report: JourneyReport,
  kind: ReturnType<typeof clientKind>,
  authUserId: string | null,
): Promise<void> {
  await pool.query(RECORD_SQL, [
    report.viewerId,
    authUserId,
    report.region,
    report.city,
    kind.os,
    kind.browser,
    kind.device,
    report.language,
    report.source,
    report.campaign,
    report.viewId,
    report.visitId,
    report.path,
    report.seq,
    report.seconds,
    report.scroll,
    JSON.stringify(report.events),
  ])
}

export async function forgetViewer(pool: JourneyPool, viewerId: string): Promise<void> {
  await pool.query('DELETE FROM journey_viewers WHERE id = $1', [viewerId])
}

/** Views by their own age, so a reader who keeps returning still loses old ones. */
export async function pruneJourneys(pool: JourneyPool): Promise<void> {
  await pool.query(`DELETE FROM journey_views WHERE started_at < now() - interval '${RETENTION_DAYS} days'`)
  await pool.query(`DELETE FROM journey_viewers WHERE last_seen_at < now() - interval '${RETENTION_DAYS} days'`)
}
