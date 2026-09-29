import { describe, expect, it } from 'vitest'

import { DEV_MEMBERSHIP_STATES, devMembershipStateOf, devToolsRefusal, isDevMembershipStateName } from './membership-states'
import type { DevMembershipStateName } from './membership-states'

describe('devToolsRefusal', () => {
  const local = 'postgres://me@localhost:5432/questura'

  it('allows a local database outside production', () => {
    expect(devToolsRefusal({ NODE_ENV: 'development', databaseUri: local })).toBeNull()
    expect(devToolsRefusal({ NODE_ENV: 'development', databaseUri: 'postgres://me@127.0.0.1/q' })).toBeNull()
  })

  it('refuses production mode even against a local database', () => {
    expect(devToolsRefusal({ NODE_ENV: 'production', databaseUri: local })).toMatch(/production/)
  })

  it('refuses any database that is not on this machine', () => {
    expect(devToolsRefusal({ NODE_ENV: 'development', databaseUri: 'postgres://u@ep-x.us-east-1.aws.neon.tech/neondb' })).toMatch(/neon\.tech/)
  })

  it('refuses a missing or unparseable DATABASE_URI', () => {
    expect(devToolsRefusal({ NODE_ENV: 'development', databaseUri: '' })).not.toBeNull()
    expect(devToolsRefusal({ NODE_ENV: 'development', databaseUri: 'not a url' })).not.toBeNull()
  })
})

describe('devMembershipStateOf', () => {
  const now = Date.UTC(2026, 8, 28)

  it('reads back every state it writes', () => {
    for (const name of Object.keys(DEV_MEMBERSHIP_STATES) as DevMembershipStateName[]) {
      expect(devMembershipStateOf(DEV_MEMBERSHIP_STATES[name].row(now), now)).toBe(name)
    }
  })

  it('treats a missing profile as never paid', () => {
    expect(devMembershipStateOf(null, now)).toBe('none')
  })

  it('names a row none of the states wrote as other', () => {
    const row = { ...DEV_MEMBERSHIP_STATES.member.row(now), paid_through_at: new Date(now - 1000) }
    expect(devMembershipStateOf(row, now)).toBe('other')
  })
})

describe('isDevMembershipStateName', () => {
  it('accepts only the listed names', () => {
    expect(isDevMembershipStateName('member')).toBe(true)
    expect(isDevMembershipStateName('toString')).toBe(false)
    expect(isDevMembershipStateName(undefined)).toBe(false)
  })
})
