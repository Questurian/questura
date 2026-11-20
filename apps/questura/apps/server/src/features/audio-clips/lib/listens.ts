import type { Payload } from 'payload'

/**
 * Listens (ADR-0018): recording them, and the numbers the studio reads.
 *
 * A Listen is upserted by the id the player made for it, so every report
 * from one play (every 15 s, on pause, when the page closes) updates one row.
 * The player sends everything it has heard so far; the server keeps the
 * larger of what it had and what it got, so a late or repeated report never
 * makes a Listen shrink.
 */

export type HeardRange = [number, number]

export const HEAT_BUCKETS = 24

/** Sorted, merged, clamped to the clip, at most 200 stretches. */
export function normalizeRanges(raw: unknown, duration: number): HeardRange[] | null {
  if (!Array.isArray(raw) || raw.length > 500) return null
  const ranges: HeardRange[] = []
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 2) return null
    const [a, b] = item.map(Number)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null
    const from = Math.max(0, Math.min(a, b, duration))
    const to = Math.max(0, Math.min(Math.max(a, b), duration))
    if (to - from >= 0.05) ranges.push([from, to])
  }
  return mergeRanges(ranges).slice(0, 200)
}

export function mergeRanges(ranges: HeardRange[]): HeardRange[] {
  const sorted = [...ranges].sort((x, y) => x[0] - y[0])
  const out: HeardRange[] = []
  for (const [from, to] of sorted) {
    const last = out[out.length - 1]
    if (last && from <= last[1] + 0.3) last[1] = Math.max(last[1], to)
    else out.push([from, to])
  }
  return out.map(([from, to]) => [Math.round(from * 10) / 10, Math.round(to * 10) / 10])
}

export function coveredSeconds(ranges: HeardRange[]): number {
  return ranges.reduce((sum, [from, to]) => sum + (to - from), 0)
}

type ListenRow = {
  id: number
  listenId: string
  authUserId: string
  clipId: number
  articleId: number
  sectionKey: string
  isStaff?: boolean | null
  startedAt: string
  lastHeardAt: string
  secondsHeard: number
  clipDuration: number
  ranges?: unknown
  speeds?: unknown
  finished?: boolean | null
}

export type ListenReport = {
  listenId: string
  authUserId: string
  isStaff: boolean
  clip: { id: number; articleId: number; sectionKey: string; durationSeconds: number }
  secondsHeard: number
  ranges: HeardRange[]
  speeds: number[]
  finished: boolean
}

export async function recordListen(payload: Payload, report: ListenReport): Promise<'created' | 'updated' | 'not-yours'> {
  const now = new Date().toISOString()
  const existing = await payload.find({
    collection: 'audio-listens',
    where: { listenId: { equals: report.listenId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = existing.docs[0] as unknown as ListenRow | undefined
  const duration = report.clip.durationSeconds
  // Heard time can not be more than the wall-clock time a page could have played at 2x.
  const capSeconds = (startedAt: string) => Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 1000) * 2 + 5

  if (!row) {
    const ranges = mergeRanges(report.ranges)
    await payload.create({
      collection: 'audio-listens',
      overrideAccess: true,
      data: {
        listenId: report.listenId,
        authUserId: report.authUserId,
        clipId: report.clip.id,
        articleId: report.clip.articleId,
        sectionKey: report.clip.sectionKey,
        isStaff: report.isStaff,
        startedAt: now,
        lastHeardAt: now,
        secondsHeard: Math.min(report.secondsHeard, duration * 20),
        clipDuration: duration,
        ranges,
        speeds: [...new Set(report.speeds)].slice(0, 8),
        finished: report.finished,
      },
    })
    return 'created'
  }

  if (row.authUserId !== report.authUserId || Number(row.clipId) !== Number(report.clip.id)) return 'not-yours'
  const previousRanges = (Array.isArray(row.ranges) ? row.ranges : []) as HeardRange[]
  const previousSpeeds = (Array.isArray(row.speeds) ? row.speeds : []) as number[]
  await payload.update({
    collection: 'audio-listens',
    id: row.id,
    overrideAccess: true,
    data: {
      lastHeardAt: now,
      secondsHeard: Math.min(Math.max(row.secondsHeard, report.secondsHeard), capSeconds(row.startedAt), duration * 20),
      ranges: mergeRanges([...previousRanges, ...report.ranges]),
      speeds: [...new Set([...previousSpeeds, ...report.speeds])].slice(0, 8),
      finished: Boolean(row.finished) || report.finished,
    },
  })
  return 'updated'
}

export type ClipStats = {
  listens: number
  members: number
  secondsHeard: number
  averageShareHeard: number | null
  finished: number
  heat: number[]
}

function statsFor(rows: ListenRow[]): ClipStats {
  const counted = rows.filter((row) => !row.isStaff)
  const heat = new Array<number>(HEAT_BUCKETS).fill(0)
  let shareSum = 0
  for (const row of counted) {
    const ranges = (Array.isArray(row.ranges) ? row.ranges : []) as HeardRange[]
    const duration = row.clipDuration || 1
    shareSum += Math.min(1, coveredSeconds(ranges) / duration)
    for (let bucket = 0; bucket < HEAT_BUCKETS; bucket += 1) {
      const middle = ((bucket + 0.5) / HEAT_BUCKETS) * duration
      if (ranges.some(([from, to]) => middle >= from && middle <= to)) heat[bucket] += 1
    }
  }
  return {
    listens: counted.length,
    members: new Set(counted.map((row) => row.authUserId)).size,
    secondsHeard: Math.round(counted.reduce((sum, row) => sum + (row.secondsHeard || 0), 0)),
    averageShareHeard: counted.length ? Math.round((shareSum / counted.length) * 100) / 100 : null,
    finished: counted.filter((row) => row.finished).length,
    heat: heat.map((value) => (counted.length ? Math.round((value / counted.length) * 100) / 100 : 0)),
  }
}

export type ListenView = {
  id: number
  clipId: number
  member: string
  isStaff: boolean
  startedAt: string
  secondsHeard: number
  clipDuration: number
  ranges: HeardRange[]
  speeds: number[]
  finished: boolean
}

/** Per clip: numbers for the last 30 days and all time, plus the latest Listens with who they were. */
export async function listenStatsForArticle(payload: Payload, articleId: number) {
  const result = await payload.find({
    collection: 'audio-listens',
    where: { articleId: { equals: articleId } },
    limit: 20000,
    depth: 0,
    sort: '-startedAt',
    overrideAccess: true,
  })
  const rows = result.docs as unknown as ListenRow[]
  const since = Date.now() - 30 * 24 * 3600 * 1000

  const userIds = [...new Set(rows.slice(0, 2000).map((row) => row.authUserId))]
  const emails = new Map<string, string>()
  if (userIds.length > 0) {
    const pool = (payload.db as unknown as { pool: { query: (sql: string, values: unknown[]) => Promise<{ rows: Array<{ id: string; email: string }> }> } }).pool
    const found = await pool.query(`SELECT id, email FROM visitor_auth_users WHERE id = ANY($1::text[])`, [userIds])
    for (const user of found.rows) emails.set(user.id, user.email)
  }

  const byClip = new Map<number, ListenRow[]>()
  for (const row of rows) byClip.set(Number(row.clipId), [...(byClip.get(Number(row.clipId)) ?? []), row])

  const clips: Record<string, { last30Days: ClipStats; allTime: ClipStats; recent: ListenView[] }> = {}
  for (const [clipId, clipRows] of byClip) {
    clips[String(clipId)] = {
      last30Days: statsFor(clipRows.filter((row) => new Date(row.startedAt).getTime() >= since)),
      allTime: statsFor(clipRows),
      recent: clipRows.slice(0, 100).map((row) => ({
        id: row.id,
        clipId: row.clipId,
        member: emails.get(row.authUserId) ?? 'deleted account',
        isStaff: Boolean(row.isStaff),
        startedAt: row.startedAt,
        secondsHeard: Math.round(row.secondsHeard),
        clipDuration: row.clipDuration,
        ranges: (Array.isArray(row.ranges) ? row.ranges : []) as HeardRange[],
        speeds: (Array.isArray(row.speeds) ? row.speeds : []) as number[],
        finished: Boolean(row.finished),
      })),
    }
  }
  return clips
}
