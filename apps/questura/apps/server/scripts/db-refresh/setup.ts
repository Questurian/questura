/**
 * One-time setup for `pnpm db:refresh`: make the live read-only login.
 *
 * Connects to live Neon as the app's owner login (NEON_DATABASE_URI_DIRECT in
 * ~/.questura-vault/generated.env), then creates or resets
 * `questura_local_refresh`: it can log in and SELECT the content tables in
 * tables.ts, nothing else. Its sessions also start read-only. The
 * role is made with SQL, not Neon's console or API, because Neon adds roles
 * made there to neon_superuser.
 *
 * It then proves the limits from the new login (content readable, staff and
 * reader tables refused, writes refused) and saves its URL to
 * ~/.questura-vault/local-refresh.env. No password is printed.
 *
 * Run again after adding a content table, or to change the password.
 *
 * Usage (from apps/questura/apps/server): pnpm db:refresh:setup
 */

import { randomBytes } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Client } from 'pg'

import { REFRESH_ROLE, setupRoleSql } from './plan'
import { SOURCE_VARIABLE, VAULT_FILE } from './refresh-paths'

const OWNER_FILE = path.join(os.homedir(), '.questura-vault', 'generated.env')
const OWNER_VARIABLE = 'NEON_DATABASE_URI_DIRECT'

function fail(message: string): never {
  console.error(`db:refresh:setup stopped: ${message}`)
  process.exit(1)
}

function readVaultValue(file: string, name: string): string {
  if (!fs.existsSync(file)) fail(`${file} not found`)
  const line = fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`))
  if (!line) fail(`${name} is not in ${file}`)
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
}

async function expectRefused(client: Client, sql: string, what: string) {
  try {
    await client.query(sql)
  } catch {
    return
  }
  throw new Error(`the new login could ${what}; it must not`)
}

async function main() {
  // DB_REFRESH_OWNER_URL: rehearse against a scratch database instead of live.
  const ownerUrl = process.env.DB_REFRESH_OWNER_URL || readVaultValue(OWNER_FILE, OWNER_VARIABLE)
  const owner = new Client({ connectionString: ownerUrl, connectionTimeoutMillis: 15000 })
  await owner.connect()

  const password = randomBytes(24).toString('base64url')
  let database: string
  try {
    database = (await owner.query<{ db: string }>('SELECT current_database() AS db')).rows[0].db
    const { rows } = await owner.query<{ name: string }>(
      `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`,
    )
    // Sent as one simple-protocol batch so the DO blocks and BEGIN/COMMIT run as written.
    await owner.query(setupRoleSql({ database, password, existingTables: rows.map((r) => r.name) }))
    console.log(`Live login ${REFRESH_ROLE} is set: read-only, content tables only.`)
  } finally {
    await owner.end()
  }

  const url = new URL(ownerUrl)
  url.username = REFRESH_ROLE
  url.password = password
  const sourceUrl = url.toString()

  const check = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 15000 })
  await check.connect()
  try {
    await check.query('SELECT 1 FROM public.articles LIMIT 1')
    await expectRefused(check, 'SELECT 1 FROM public.users LIMIT 1', 'read staff logins')
    await expectRefused(check, 'SELECT 1 FROM public.visitor_auth_users LIMIT 1', 'read reader accounts')
    await expectRefused(check, 'SELECT 1 FROM public.visitor_profiles LIMIT 1', 'read memberships')
    // SELECT grants are the real limit; the read-only default is a second one
    // a session could switch off, so the write probe runs with it off.
    await check.query('SET default_transaction_read_only = off')
    await expectRefused(check, 'DELETE FROM public.articles WHERE false', 'write to content tables')
    const { rows } = await check.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = current_user',
    )
    if (rows[0].n !== 0) throw new Error('the new login belongs to another role; it must not')
    console.log('Checked from the new login: content readable; staff, readers, members and writes refused.')
  } finally {
    await check.end()
  }

  fs.mkdirSync(path.dirname(VAULT_FILE), { recursive: true, mode: 0o700 })
  fs.writeFileSync(
    VAULT_FILE,
    `# Read-only live login for pnpm db:refresh (content tables only). Made by pnpm db:refresh:setup.\n${SOURCE_VARIABLE}=${sourceUrl}\n`,
    { mode: 0o600 },
  )
  fs.chmodSync(VAULT_FILE, 0o600)
  console.log(`Saved to ${VAULT_FILE}.`)
  console.log('Next: pnpm db:refresh   (or just pnpm dev, which refreshes when the copy is 6 h old)')
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
