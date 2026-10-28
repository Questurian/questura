import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getPasswordStrengthError } from '@/shared/lib/password-strength'

import { DevLoginError, newDevLogin, readOrCreateDevLogin } from './dev-login'

describe('saved localhost login', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'dev-login-'))
    file = path.join(dir, '.dev-login.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('generates a reserved-domain email and a password the sign-up rule accepts', () => {
    for (let i = 0; i < 50; i++) {
      const login = newDevLogin()
      expect(login.email).toMatch(/^dev-reader-[0-9a-f]{6}@example\.com$/)
      expect(getPasswordStrengthError(login.password)).toBeNull()
    }
  })

  it('writes a new login on first use, readable only by this user, and reads it back after', async () => {
    const first = await readOrCreateDevLogin(file)
    expect(first.created).toBe(true)
    expect((await stat(file)).mode & 0o777).toBe(0o600)

    const second = await readOrCreateDevLogin(file)
    expect(second).toEqual({ login: first.login, created: false })
  })

  it('reads a hand-written login, email lowercased', async () => {
    await writeFile(file, JSON.stringify({ email: ' Me@Example.com ', password: 'pw' }))
    expect((await readOrCreateDevLogin(file)).login).toEqual({ email: 'me@example.com', password: 'pw' })
  })

  it('names the file when it is broken', async () => {
    await writeFile(file, '{ nope')
    await expect(readOrCreateDevLogin(file)).rejects.toThrow(DevLoginError)
    await expect(readOrCreateDevLogin(file)).rejects.toThrow(file)

    await writeFile(file, JSON.stringify({ email: 'me@example.com' }))
    await expect(readOrCreateDevLogin(file)).rejects.toThrow('needs a "password"')
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ email: 'me@example.com' })
  })
})
