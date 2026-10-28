import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getPasswordStrengthError } from '@/shared/lib/password-strength'

/**
 * The saved localhost login: one local reader account whose email and
 * password sit in a gitignored file on this Mac, so the DEV chip can sign it
 * in without anyone typing. Only `/api/dev/session` reads it, and that route
 * refuses everywhere but a Mac (`dev-route-guard.ts`).
 *
 * First use writes the file with a fresh `dev-reader-…@example.com` account.
 * Put any other local email + password in it to be signed in as that reader
 * instead; delete it to start over with a new account.
 */
export const DEV_LOGIN_FILE = path.join(process.cwd(), '.dev-login.json')

export type DevLogin = { email: string; password: string }

export class DevLoginError extends Error {}

export function newDevLogin(): DevLogin {
  const suffix = randomBytes(3).toString('hex')
  return {
    email: `dev-reader-${suffix}@example.com`,
    // Meets the sign-up rule: length, digit, uppercase, symbol.
    password: `Dev-${randomBytes(12).toString('base64url')}-9A!`,
  }
}

export function parseDevLogin(text: string, file = DEV_LOGIN_FILE): DevLogin {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new DevLoginError(`${file} is not valid JSON. Fix it, or delete it to start over.`)
  }
  const { email, password } = (value ?? {}) as Record<string, unknown>
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new DevLoginError(`${file} needs an "email". Fix it, or delete it to start over.`)
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new DevLoginError(`${file} needs a "password". Fix it, or delete it to start over.`)
  }
  return { email: email.trim().toLowerCase(), password }
}

/** Reads the saved login, writing a new one on first use. */
export async function readOrCreateDevLogin(file = DEV_LOGIN_FILE): Promise<{ login: DevLogin; created: boolean }> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new DevLoginError(`Can't read ${file}: ${(error as Error).message}`)
    }
    const login = newDevLogin()
    const weak = getPasswordStrengthError(login.password)
    if (weak) throw new DevLoginError(`Generated password refused: ${weak}`)
    await writeFile(file, `${JSON.stringify(login, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
    return { login, created: true }
  }
  return { login: parseDevLogin(text, file), created: false }
}
