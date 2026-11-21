/**
 * Opening hours for the venue details modal, read the way a guest reads them.
 *
 * Google stores a late night split at midnight: Thursday "23:00 - 23:59:59"
 * and Friday "00:00 - 05:00". Shown raw, that is two lines and a day off.
 * `parseWeekHours` joins the pieces back into one night that belongs to the
 * day it started on (Thursday 11 PM – 5 AM), and the rest of this file
 * formats, groups and checks those nights against the clock.
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
/** Display order: the week as a reader thinks of it, Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const DAY_MINUTES = 24 * 60

/** Minutes after the day's midnight. `end` may pass 1440 when a night runs late. */
export type HoursInterval = { start: number; end: number }
/** Index 0 = Sunday. Empty array = closed. */
export type WeekHours = HoursInterval[][]

function clockToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  return hours * 60 + minutes
}

function isFullDay(interval: HoursInterval): boolean {
  return interval.start === 0 && interval.end >= DAY_MINUTES
}

/**
 * Stored `{ hours: [{ day, hours }] }` → seven days of intervals, with the
 * midnight splits joined. Null when nothing usable is stored.
 */
export function parseWeekHours(raw: unknown): WeekHours | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const rows = (raw as { hours?: unknown }).hours
  if (!Array.isArray(rows)) return null

  const week: WeekHours = DAYS.map(() => [])
  let seen = false
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const day = DAYS.indexOf(String((row as { day?: unknown }).day ?? '').trim().toLowerCase() as never)
    const value = (row as { hours?: unknown }).hours
    if (day < 0 || typeof value !== 'string') continue
    seen = true
    if (/^closed$/i.test(value.trim())) continue
    if (/^(open )?24 hours$|^24\/7$/i.test(value.trim())) {
      week[day].push({ start: 0, end: DAY_MINUTES })
      continue
    }
    for (const part of value.split(',')) {
      const [from, to] = part.split(/\s+[-–—]\s+/)
      if (!from || !to) continue
      const start = clockToMinutes(from)
      let end = clockToMinutes(to)
      if (start === null || end === null) continue
      // "23:59" and "23:59:59" both mean "until midnight".
      if (end >= DAY_MINUTES - 1) end = DAY_MINUTES
      // "17:00 - 01:00" already runs past midnight.
      if (end <= start) end += DAY_MINUTES
      week[day].push({ start, end })
    }
  }
  if (!seen) return null
  for (const day of week) day.sort((a, b) => a.start - b.start)

  // Join a night that ends at midnight with the next day's piece from midnight.
  for (let day = 0; day < 7; day += 1) {
    const last = week[day][week[day].length - 1]
    if (!last || last.end !== DAY_MINUTES || isFullDay(last)) continue
    const next = week[(day + 1) % 7]
    const first = next[0]
    if (!first || first.start !== 0 || isFullDay(first)) continue
    last.end = DAY_MINUTES + first.end
    next.shift()
  }
  return week
}

/** 1380 → "11 PM", 90 → "1:30 AM", 1440 → "12 AM". */
function clock(minutes: number, withMeridiem = true): string {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES
  const hours = Math.floor(m / 60)
  const mins = m % 60
  const display = hours % 12 === 0 ? 12 : hours % 12
  const time = mins === 0 ? String(display) : `${display}:${String(mins).padStart(2, '0')}`
  return withMeridiem ? `${time} ${hours < 12 ? 'AM' : 'PM'}` : time
}

function meridiem(minutes: number): 'AM' | 'PM' {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES
  return m < 12 * 60 ? 'AM' : 'PM'
}

/** "11 PM – 5 AM"; "1 – 3:30 AM" when both ends share AM/PM inside one stretch. */
export function formatRange(start: number, end: number): string {
  if (start === 0 && end >= DAY_MINUTES) return 'Open 24 hours'
  const sameHalf = meridiem(start) === meridiem(end) && end - start < 12 * 60
  return sameHalf
    ? `${clock(start, false)} – ${clock(end)}`
    : `${clock(start)} – ${clock(end)}`
}

export function formatDayHours(intervals: HoursInterval[]): string {
  if (intervals.length === 0) return 'Closed'
  return intervals.map((i) => formatRange(i.start, i.end)).join(', ')
}

/** "1:00 AM - 3:30 AM" → "1 – 3:30 AM". Anything else passes through. */
export function formatPeakHours(raw: string): string {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(raw.trim())
  if (!match) return raw.trim()
  const toMinutes = (h: string, m: string | undefined, half: string) =>
    ((Number(h) % 12) + (half.toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m ?? 0)
  const start = toMinutes(match[1], match[2], match[3])
  let end = toMinutes(match[4], match[5], match[6])
  if (end <= start) end += DAY_MINUTES
  return formatRange(start, end)
}

function runLabel(days: number[]): string {
  // `days` are positions in WEEK_ORDER (0 = Mon … 6 = Sun), ascending.
  if (days.length === 7) return 'Every day'
  const runs: number[][] = []
  for (const pos of days) {
    const run = runs[runs.length - 1]
    if (run && run[run.length - 1] === pos - 1) run.push(pos)
    else runs.push([pos])
  }
  return runs
    .map((run) => {
      const first = SHORT[WEEK_ORDER[run[0]]]
      const last = SHORT[WEEK_ORDER[run[run.length - 1]]]
      return run.length === 1 ? first : `${first} – ${last}`
    })
    .join(', ')
}

export type WeekSummaryLine = { days: string; hours: string; closed: boolean }

/** Days that share the same hours, one line each, open lines first: "Thu – Sat · 11 PM – 5 AM". */
export function summarizeWeek(week: WeekHours): WeekSummaryLine[] {
  const groups = new Map<string, number[]>()
  WEEK_ORDER.forEach((day, pos) => {
    const label = formatDayHours(week[day])
    groups.set(label, [...(groups.get(label) ?? []), pos])
  })
  return [...groups.entries()]
    .map(([hours, days]) => ({ days: runLabel(days), hours, closed: hours === 'Closed' }))
    .sort((a, b) => Number(a.closed) - Number(b.closed))
}

/** Weekday (0 = Sunday) and minutes past midnight at the venue (`clockInTimeZone`). */
export type VenueClock = { day: number; minutes: number }

export type HoursStatus = { label: string; detail: string; open: boolean }

/** The one line under the venue name: "Open now · until 5 AM", "Open tonight · 11 PM – 5 AM". */
export function hoursStatus(week: WeekHours, at: VenueClock): HoursStatus | null {
  const yesterday = week[(at.day + 6) % 7]
  for (const i of yesterday) {
    if (i.end > DAY_MINUTES && at.minutes < i.end - DAY_MINUTES) {
      return { label: 'Open now', detail: `until ${clock(i.end)}`, open: true }
    }
  }
  const today = week[at.day]
  for (const i of today) {
    if (isFullDay(i)) return { label: 'Open now', detail: 'open 24 hours', open: true }
    if (at.minutes >= i.start && at.minutes < i.end) {
      return { label: 'Open now', detail: `until ${clock(i.end)}`, open: true }
    }
    if (at.minutes < i.start) {
      return {
        label: i.start >= 17 * 60 ? 'Open tonight' : 'Open today',
        detail: formatRange(i.start, i.end),
        open: true,
      }
    }
  }
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (at.day + ahead) % 7
    const first = week[day][0]
    if (!first) continue
    const when = ahead === 1 ? 'tomorrow' : SHORT[day]
    return {
      label: today.length === 0 ? 'Closed today' : 'Closed now',
      detail: `opens ${when}, ${clock(first.start)}`,
      open: false,
    }
  }
  return null
}

export function isOpenOn(week: WeekHours, day: number): boolean {
  return week[day].length > 0
}
