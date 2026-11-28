import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, indexNowUrls, submitToIndexNow } from './submit'

const here = path.dirname(fileURLToPath(import.meta.url))

function stubFetch(response: Partial<Response> | Error) {
  const fetchMock = vi.fn(async (..._args: unknown[]) => {
    if (response instanceof Error) throw response
    return response as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.questurian.com')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('IndexNow key file', () => {
  it('is served by the website with exactly the key', () => {
    const file = path.resolve(here, '../../../../client/public', `${INDEXNOW_KEY}.txt`)
    expect(readFileSync(file, 'utf8').trim()).toBe(INDEXNOW_KEY)
  })
})

describe('indexNowUrls', () => {
  it('keeps public page paths and drops private or odd ones', () => {
    expect(
      indexNowUrls(
        [
          '/peru/lima/maps/best-nightclubs-in-miraflores-and-barranco',
          '/',
          '/peru/lima/',
          '/api/articles',
          '/join',
          '/purchase/monthly',
          '/account/settings',
          '/x?y=1',
          '//evil.example',
          'relative',
          '/peru/lima',
        ],
        'https://www.questurian.com',
      ),
    ).toEqual([
      'https://www.questurian.com/peru/lima/maps/best-nightclubs-in-miraflores-and-barranco',
      'https://www.questurian.com/',
      'https://www.questurian.com/peru/lima',
    ])
  })
})

describe('submitToIndexNow', () => {
  it('posts the live URLs with the key and its location', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200 })
    await expect(submitToIndexNow(['/peru/lima'])).resolves.toBe('sent')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(INDEXNOW_ENDPOINT)
    expect(JSON.parse(String(init.body))).toEqual({
      host: 'www.questurian.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://www.questurian.com/${INDEXNOW_KEY}.txt`,
      urlList: ['https://www.questurian.com/peru/lima'],
    })
  })

  it('sends nothing off the live site', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200 })
    for (const value of ['', 'http://localhost:3000', 'https://questurian.com', 'http://www.questurian.com']) {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', value)
      await expect(submitToIndexNow(['/peru/lima'])).resolves.toBe('skipped')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing when no page path is left', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200 })
    await expect(submitToIndexNow(['/api/x'])).resolves.toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws when the engine refuses or is down', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubFetch({ ok: false, status: 429 })
    await expect(submitToIndexNow(['/peru/lima'])).resolves.toBe('failed')
    stubFetch(new Error('network down'))
    await expect(submitToIndexNow(['/peru/lima'])).resolves.toBe('failed')
  })
})
