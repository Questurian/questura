import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatDayHours,
  formatPeakHours,
  hoursStatus,
  parseWeekHours,
  summarizeWeek,
} from './venueHours.ts'
import { clockInTimeZone } from '../../../lib/dates.ts'
import { levelScale, priceScale, sizeScale } from './venueScale.ts'

// Lima Bar, as Google stores it: each late night split at midnight.
const limaBar = {
  hours: [
    { day: 'Sunday', hours: '00:00:00 - 05:00:00' },
    { day: 'Monday', hours: 'Closed' },
    { day: 'Tuesday', hours: 'Closed' },
    { day: 'Wednesday', hours: 'Closed' },
    { day: 'Thursday', hours: '23:00:00 - 23:59:59' },
    { day: 'Friday', hours: '00:00:00 - 05:00:00, 23:00:00 - 23:59:59' },
    { day: 'Saturday', hours: '00:00:00 - 05:00:00, 23:00:00 - 23:59:59' },
  ],
}

const THU = 4
const FRI = 5
const SUN = 0
const MON = 1

test('a night split at midnight is joined onto the day it started', () => {
  const week = parseWeekHours(limaBar)
  assert.equal(formatDayHours(week[THU]), '11 PM – 5 AM')
  assert.equal(formatDayHours(week[FRI]), '11 PM – 5 AM')
  assert.equal(formatDayHours(week[6]), '11 PM – 5 AM')
  // Sunday's 00:00 – 05:00 was Saturday night, so Sunday itself is closed.
  assert.equal(formatDayHours(week[SUN]), 'Closed')
})

test('the week reads as grouped lines, open first', () => {
  assert.deepEqual(summarizeWeek(parseWeekHours(limaBar)), [
    { days: 'Thu – Sat', hours: '11 PM – 5 AM', closed: false },
    { days: 'Mon – Wed, Sun', hours: 'Closed', closed: true },
  ])
})

test('23:59:00 also means midnight, and hours that already cross midnight stay one range', () => {
  const week = parseWeekHours({
    hours: [
      { day: 'Wednesday', hours: '19:00:00 - 23:59:00' },
      { day: 'Thursday', hours: '00:00:00 - 02:30:00' },
      { day: 'Friday', hours: '17:00:00 - 03:00:00' },
    ],
  })
  assert.equal(formatDayHours(week[3]), '7 PM – 2:30 AM')
  assert.equal(formatDayHours(week[THU]), 'Closed')
  assert.equal(formatDayHours(week[FRI]), '5 PM – 3 AM')
})

test('a full day is not chained into the next', () => {
  const allDay = { hours: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({ day, hours: '00:00:00 - 23:59:59' })) }
  assert.deepEqual(summarizeWeek(parseWeekHours(allDay)), [
    { days: 'Every day', hours: 'Open 24 hours', closed: false },
  ])
})

test('nothing stored means no hours', () => {
  assert.equal(parseWeekHours(null), null)
  assert.equal(parseWeekHours({ hours: [] }), null)
})

test('status line follows the venue clock', () => {
  const week = parseWeekHours(limaBar)
  assert.deepEqual(hoursStatus(week, { day: FRI, minutes: 20 * 60 }), {
    label: 'Open tonight',
    detail: '11 PM – 5 AM',
    open: true,
  })
  // 2 AM Saturday is still Friday night.
  assert.deepEqual(hoursStatus(week, { day: 6, minutes: 2 * 60 }), {
    label: 'Open now',
    detail: 'until 5 AM',
    open: true,
  })
  assert.deepEqual(hoursStatus(week, { day: MON, minutes: 21 * 60 }), {
    label: 'Closed today',
    detail: 'opens Thu, 11 PM',
    open: false,
  })
  assert.deepEqual(hoursStatus(week, { day: 3, minutes: 12 * 60 }), {
    label: 'Closed today',
    detail: 'opens tomorrow, 11 PM',
    open: false,
  })
})

test('venue clock reads the venue time zone', () => {
  // 2026-11-21 04:30 UTC is Friday 11:30 PM in Lima (UTC-5).
  assert.deepEqual(clockInTimeZone(new Date('2026-11-21T04:30:00Z'), 'America/Lima'), {
    day: FRI,
    minutes: 23 * 60 + 30,
  })
  assert.equal(clockInTimeZone(new Date(), ''), null)
  assert.equal(clockInTimeZone(new Date(), 'Not/AZone'), null)
})

test('peak hours drop the repeated AM/PM', () => {
  assert.equal(formatPeakHours('1:00 AM - 3:30 AM'), '1 – 3:30 AM')
  assert.equal(formatPeakHours('10:00 PM - 2:00 AM'), '10 PM – 2 AM')
  assert.equal(formatPeakHours('9:00 PM - 12:00 AM'), '9 PM – 12 AM')
  assert.equal(formatPeakHours('late'), 'late')
})

test('scales map the stored words', () => {
  assert.deepEqual(levelScale('High'), { filled: 4, of: 5 })
  assert.deepEqual(levelScale('Very High'), { filled: 5, of: 5 })
  assert.deepEqual(sizeScale('Intimate'), { filled: 1, of: 5 })
  assert.deepEqual(priceScale('$$$'), { filled: 3, of: 4 })
  assert.equal(levelScale('Buzzing'), null)
})
