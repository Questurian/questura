import { describe, expect, it } from 'vitest'

import { clientKind, isAutomated } from './client-kind'
import { MAX_EVENTS, parseJourneyBody } from './report'

const ID = '7f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f'
const VALID = { viewerId: ID, visitId: ID, viewId: ID, seq: 1, path: '/peru/lima', seconds: 12, scroll: 40, events: [] }
const parse = (over: Record<string, unknown>) => parseJourneyBody(JSON.stringify({ ...VALID, ...over }))

describe('parseJourneyBody', () => {
  it('accepts a report and a deletion', () => {
    expect(parse({})).toMatchObject({ report: { path: '/peru/lima', seconds: 12 } })
    expect(parseJourneyBody(JSON.stringify({ forget: ID }))).toEqual({ forget: ID })
  })

  it.each([
    ['a query string', { path: '/reset?token=abc' }],
    ['a fragment', { path: '/a#b' }],
    ['another host', { path: '//evil.example' }],
    ['a scheme', { path: 'javascript:alert(1)' }],
    ['a bad id', { viewerId: 'me' }],
    ['negative time', { seconds: -1 }],
    ['a fraction', { seconds: 1.5 }],
    ['scroll over 100', { scroll: 101 }],
    ['an unknown event', { events: [{ t: 1, k: 'keystroke', x: 'secret' }] }],
    ['too many events', { events: Array.from({ length: MAX_EVENTS + 1 }, () => ({ t: 1, k: 'tap' })) }],
  ])('refuses %s', (_name, over) => {
    expect(parse(over)).toBeNull()
  })

  it('drops a label holding an address, and fields outside the shape', () => {
    const parsed = parse({ ip: '192.0.2.1', typed: 'secret', events: [{ t: 1, k: 'tap', x: 'me@example.com', value: 'secret' }] })
    expect(parsed).toMatchObject({ report: { events: [{ t: 1, k: 'tap' }] } })
    expect(JSON.stringify(parsed)).not.toMatch(/secret|example\.com|192\.0/)
  })

  it('takes no noticeable time over 16 KB of junk', () => {
    const started = performance.now()
    parse({ city: 'a'.repeat(15_000), source: 'b'.repeat(500) })
    expect(performance.now() - started).toBeLessThan(50)
  })

  it('cleans text Postgres or the dashboard could not take', () => {
    const parsed = parse({ city: 'Mia\u0000mi‮', events: [{ t: 1, k: 'tap', x: `${'😀'.repeat(90)}\ud800` }] })
    const report = parsed && 'report' in parsed ? parsed.report : null
    expect(report?.city).toBe('Mia mi')
    expect(Array.from(report!.events[0].x!)).toHaveLength(80)
  })
})

describe('client kind', () => {
  it('names the in-app browser', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) Mobile/15E148 Instagram 410.0.0.0'
    expect(clientKind(ua)).toEqual({ os: 'iOS 26', browser: 'Inside Instagram', device: 'iPhone' })
  })

  it('takes the real iOS number from Safari', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) Version/26.1 Mobile/15E148 Safari/604.1'
    expect(clientKind(ua).os).toBe('iOS 26')
  })

  it('leaves robots out, and keeps Cubot phones', () => {
    expect(isAutomated('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isAutomated('facebookexternalhit/1.1')).toBe(true)
    expect(isAutomated('Mozilla/5.0 HeadlessChrome/141.0')).toBe(true)
    expect(isAutomated('Mozilla/5.0 (Linux; Android 13; CUBOT P80) Chrome/141.0 Mobile Safari/537.36')).toBe(false)
    expect(isAutomated('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/141.0 Mobile Safari/537.36')).toBe(false)
  })
})
