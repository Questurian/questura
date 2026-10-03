/**
 * Replace the Mac's content with a fresh copy of live's.
 *
 * What it copies: the CONTENT tables in tables.ts (articles, locations, pages,
 * photos, listicles...). What it never copies or touches: the PRIVATE tables
 * (staff logins, readers, members, payments, email). Local test accounts and
 * `dev:member` states survive a refresh.
 *
 * Why it cannot hurt live: it reads live through `questura_local_refresh`, a
 * login that can only SELECT content tables (`pnpm db:refresh:setup` makes
 * it and proves that). It only writes to a database on this
 * machine: `devToolsRefusal` refuses anything else.
 *
 * How: one `pg_dump --data-only` of the content tables (a single consistent
 * snapshot), loaded into the local database in one transaction as the local
 * Postgres superuser, with foreign-key triggers off; links between copied and
 * kept rows are then fixed up (plan.ts, danglingLinkSql). Any failure rolls
 * the whole thing back and the old local content stays.
 *
 * Usage (from apps/questura/apps/server):
 *   pnpm db:refresh           # refresh now
 *   pnpm db:refresh --auto    # what `pnpm dev` runs: refresh only if older
 *                             # than 6 h, never fail the dev server
 * Set QUESTURA_DB_REFRESH=off to stop `pnpm dev` refreshing.
 */

import 'dotenv/config'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client } from 'pg'

import { devToolsRefusal } from '../../src/features/dev-tools/membership-states'
import { compareMigrations, describeAge, type ForeignKey, isStale, postludeSql, preludeSql } from './plan'
import { SOURCE_VARIABLE, VAULT_FILE } from './refresh-paths'
import { CONTENT_TABLES, unclassifiedTables } from './tables'

const STAMP_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.local-db-refresh.json')

const auto = process.argv.includes('--auto')

class Stop extends Error {}

/** The last lines of a tool's stderr, short enough to read (psql echoes whole rows). */
function tail(stderr: string): string {
  const text = stderr.trim().split('\n').slice(-3).join(' ')
  return text.length > 400 ? `${text.slice(0, 400)}...` : text
}

function say(line: string) {
  console.log(auto ? `    ${line}` : line)
}

function readStamp(): { refreshedAt: string } | null {
  try {
    return JSON.parse(fs.readFileSync(STAMP_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function readSourceUrl(): string | null {
  if (!fs.existsSync(VAULT_FILE)) return null
  const line = fs
    .readFileSync(VAULT_FILE, 'utf-8')
    .split('\n')
    .find((l) => l.startsWith(`${SOURCE_VARIABLE}=`))
  return line ? line.slice(SOURCE_VARIABLE.length + 1).trim() : null
}

/** The local database, as this Mac's Postgres superuser (needed to switch foreign-key triggers off). */
function localSuperuserUrl(databaseUri: string): string {
  if (process.env.LOCAL_SUPERUSER_DATABASE_URI) return process.env.LOCAL_SUPERUSER_DATABASE_URI
  const url = new URL(databaseUri)
  url.username = os.userInfo().username
  url.password = ''
  return url.toString()
}

/** A pg_dump at least as new as the live server, or pg_dump refuses. */
function findPgDump(serverMajor: number): string {
  const candidates = [
    ...[17, 18, 19].filter((v) => v >= serverMajor).map((v) => `/opt/homebrew/opt/postgresql@${v}/bin/pg_dump`),
    'pg_dump',
  ]
  for (const bin of candidates) {
    const probe = spawnSync(bin, ['--version'], { encoding: 'utf-8' })
    const major = Number(probe.stdout?.match(/(\d+)\./)?.[1])
    if (probe.status === 0 && major >= serverMajor) return bin
  }
  throw new Stop(`no pg_dump ${serverMajor} or newer found. Install it with: brew install postgresql@${serverMajor}`)
}

async function tablesIn(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ name: string }>(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY 1`,
  )
  return rows.map((r) => r.name)
}

async function migrationNames(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ name: string }>('SELECT name FROM payload_migrations ORDER BY name')
  return rows.map((r) => r.name)
}

async function foreignKeys(client: Client): Promise<ForeignKey[]> {
  const { rows } = await client.query<ForeignKey>(
    `SELECT c.conrelid::regclass::text AS "table", a.attname AS "column",
            c.confrelid::regclass::text AS "refTable", ra.attname AS "refColumn",
            c.confdeltype AS "onDelete", NOT a.attnotnull AS nullable
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
       JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey, 1) = 1`,
  )
  return rows.map((r) => ({ ...r, table: r.table.replace(/^public\./, '').replace(/"/g, ''), refTable: r.refTable.replace(/^public\./, '').replace(/"/g, '') }))
}

async function refresh(): Promise<void> {
  const databaseUri = process.env.DATABASE_URI
  const refusal = devToolsRefusal({ NODE_ENV: process.env.NODE_ENV, databaseUri })
  if (refusal) throw new Stop(`${refusal}. db:refresh only writes to a database on this machine.`)

  const sourceUrl = readSourceUrl()
  if (!sourceUrl) {
    throw new Stop(`no live read-only login yet (${VAULT_FILE}). Run once: pnpm db:refresh:setup`)
  }

  const live = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 15000 })
  const local = new Client({ connectionString: localSuperuserUrl(databaseUri!), connectionTimeoutMillis: 10000 })
  await live.connect()
  try {
    await local.connect()
  } catch (error) {
    await live.end()
    throw new Stop(
      `could not connect to the local database as the Postgres superuser (${(error as Error).message}). ` +
        'Set LOCAL_SUPERUSER_DATABASE_URI to a superuser URL for the same database.',
    )
  }

  let dumpFile: string | null = null
  try {
    const { rows } = await local.query<{ rolsuper: boolean }>('SELECT rolsuper FROM pg_roles WHERE rolname = current_user')
    if (!rows[0]?.rolsuper) throw new Stop('the local connection is not a superuser. Set LOCAL_SUPERUSER_DATABASE_URI.')

    const drift = compareMigrations(await migrationNames(live), await migrationNames(local))
    if (!drift.ok) throw new Stop(drift.reason)
    if (drift.localAhead.length > 0) {
      say(`Note: your local database has ${drift.localAhead.length} migration(s) live does not yet; new columns get their defaults.`)
    }

    const localTables = new Set(await tablesIn(local))
    const unclassified = unclassifiedTables(localTables)
    if (unclassified.length > 0) {
      say(`Not copied, not classified yet (add to scripts/db-refresh/tables.ts): ${unclassified.join(', ')}`)
    }
    const tables = CONTENT_TABLES.filter((name) => localTables.has(name))

    const unreadable: string[] = []
    for (const name of tables) {
      const { rows: allowed } = await live.query<{ ok: boolean }>(
        `SELECT to_regclass($1) IS NOT NULL AND has_table_privilege(to_regclass($1), 'SELECT') AS ok`,
        [`public.${name}`],
      )
      if (!allowed[0]?.ok) unreadable.push(name)
    }
    if (unreadable.length > 0) {
      throw new Stop(`the live login cannot read ${unreadable.join(', ')}. Run pnpm db:refresh:setup again.`)
    }

    const serverMajor = Math.floor(Number((await live.query('SHOW server_version_num')).rows[0].server_version_num) / 10000)
    const pgDump = findPgDump(serverMajor)
    const fks = await foreignKeys(local)

    say(`Copying ${tables.length} content tables from live...`)
    const started = Date.now()
    dumpFile = path.join(os.tmpdir(), `questura-refresh-${process.pid}.sql`)
    const dump = spawnSync(
      pgDump,
      ['--data-only', '--no-owner', '--no-privileges', '--no-comments', '-f', dumpFile, ...tables.flatMap((t) => ['-t', `public.${t}`]), sourceUrl],
      { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] },
    )
    if (dump.status !== 0) throw new Stop(`pg_dump failed: ${tail(dump.stderr)}`)

    // pg_dump 17 sets transaction_timeout, which a Postgres older than 17 (the
    // Mac's may be) rejects. It is only a guard against a hung restore.
    const dumped = fs.readFileSync(dumpFile, 'utf-8')
    fs.writeFileSync(dumpFile, dumped.replace(/^SET transaction_timeout = 0;$/m, ''))

    const dir = path.dirname(dumpFile)
    const prelude = path.join(dir, `questura-refresh-${process.pid}-prelude.sql`)
    const postlude = path.join(dir, `questura-refresh-${process.pid}-postlude.sql`)
    fs.writeFileSync(prelude, preludeSql(tables))
    fs.writeFileSync(postlude, postludeSql(fks))

    // The psql beside pg_dump: pg_dump 17.6+ writes `\restrict` lines older psql rejects.
    const psql = pgDump.includes('/') ? path.join(path.dirname(pgDump), 'psql') : 'psql'
    const load = spawnSync(
      psql,
      ['-X', '-q', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-d', localSuperuserUrl(databaseUri!), '-f', prelude, '-f', dumpFile, '-f', postlude],
      { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] },
    )
    fs.rmSync(prelude, { force: true })
    fs.rmSync(postlude, { force: true })
    if (load.status !== 0) {
      throw new Stop(`loading into the local database failed, nothing changed: ${tail(load.stderr)}`)
    }

    fs.writeFileSync(STAMP_FILE, JSON.stringify({ refreshedAt: new Date().toISOString() }, null, 2) + '\n')
    say(`Local content now matches live (${Math.round((Date.now() - started) / 1000)} s).`)
    if (!auto) say('If pnpm dev is running, restart it so pages stop showing what they cached before.')
  } finally {
    if (dumpFile) fs.rmSync(dumpFile, { force: true })
    await live.end().catch(() => {})
    await local.end().catch(() => {})
  }
}

async function main() {
  if (auto) {
    if (process.env.QUESTURA_DB_REFRESH === 'off') return
    const stamp = readStamp()
    if (!readSourceUrl()) {
      say('Local content:      old copy. Run pnpm db:refresh:setup once to keep it in step with live.')
      return
    }
    if (!isStale(stamp?.refreshedAt ?? null, Date.now())) {
      say(`Local content:      copied from live ${describeAge(stamp!.refreshedAt, Date.now())}`)
      return
    }
  }

  try {
    await refresh()
  } catch (error) {
    const message = error instanceof Stop ? error.message : (error as Error).stack ?? String(error)
    if (auto) {
      say(`⚠️  Could not refresh local content from live: ${message}`)
      say('    The dev server starts anyway, with the content it already had.')
      return
    }
    console.error(`db:refresh stopped: ${message}`)
    process.exitCode = 1
  }
}

void main()
