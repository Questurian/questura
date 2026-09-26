import { describe, expect, it } from 'vitest'

import { releaseSha } from './release'

describe('releaseSha', () => {
  it('prefers the explicit release', () => {
    expect(releaseSha({ QUESTURA_RELEASE_SHA: ' abc1234 ', RAILWAY_GIT_COMMIT_SHA: 'def5678' })).toBe('abc1234')
  })

  // Railway sets this on every GitHub deploy; the live API said `unknown`.
  it('falls back to the commit Railway deployed', () => {
    expect(releaseSha({ RAILWAY_GIT_COMMIT_SHA: '1359a926ffff' })).toBe('1359a926ffff')
    expect(releaseSha({ QUESTURA_RELEASE_SHA: '  ', RAILWAY_GIT_COMMIT_SHA: '1359a926ffff' })).toBe('1359a926ffff')
  })

  it('is undefined when nothing names a commit', () => {
    expect(releaseSha({})).toBeUndefined()
  })
})
