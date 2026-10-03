/**
 * The pure half of `pnpm db:refresh` and `pnpm db:refresh:setup`: the SQL
 * they run and the decisions they make, kept apart from connections so they
 * can be tested. See refresh.ts for the whole flow.
 */

import { isContentTable, MIGRATIONS_TABLE } from './tables'

export const REFRESH_ROLE = 'questura_local_refresh'

/** How old the local copy may get before `pnpm dev` refreshes it. */
export const AUTO_REFRESH_AFTER_MS = 6 * 60 * 60 * 1000

const identifier = /^[a-z_][a-z0-9_]*$/

function quoteIdent(name: string): string {
  if (!identifier.test(name)) throw new Error(`unexpected table name: ${name}`)
  return `"${name}"`
}

/**
 * Creates or resets the live read-only login and gives it SELECT on exactly
 * the content tables that exist, their sequences (pg_dump reads them to carry
 * the next id across), and the migrations table. Everything else it had is
 * revoked first, so re-running after a table moves lists is enough.
 */
export function setupRoleSql(input: { database: string; password: string; existingTables: string[] }): string {
  if (!/^[A-Za-z0-9_-]{24,}$/.test(input.password)) throw new Error('password must be url-safe and at least 24 characters')
  const readable = input.existingTables.filter((name) => isContentTable(name) || name === MIGRATIONS_TABLE).sort()
  const role = quoteIdent(REFRESH_ROLE)
  const tableList = readable.map((name) => `'${name}'`).join(', ')

  return [
    'BEGIN;',
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${REFRESH_ROLE}') THEN CREATE ROLE ${role}; END IF; END $$;`,
    `ALTER ROLE ${role} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${input.password}';`,
    `ALTER ROLE ${role} SET default_transaction_read_only = on;`,
    `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role};`,
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${role};`,
    `GRANT CONNECT ON DATABASE ${quoteIdent(input.database)} TO ${role};`,
    `GRANT USAGE ON SCHEMA public TO ${role};`,
    ...readable.map((name) => `GRANT SELECT ON public.${quoteIdent(name)} TO ${role};`),
    `DO $$ DECLARE seq regclass; BEGIN
  FOR seq IN
    SELECT s.oid::regclass FROM pg_class s
      JOIN pg_depend d ON d.objid = s.oid AND d.deptype IN ('a', 'i')
      JOIN pg_class t ON t.oid = d.refobjid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE s.relkind = 'S' AND n.nspname = 'public' AND t.relname IN (${tableList})
  LOOP
    EXECUTE format('GRANT SELECT ON SEQUENCE %s TO ${REFRESH_ROLE}', seq);
  END LOOP;
END $$;`,
    'COMMIT;',
  ].join('\n')
}

export type MigrationDrift =
  | { ok: true; localAhead: string[] }
  | { ok: false; reason: string }

/** Live data only fits a local schema that has every migration live has. */
export function compareMigrations(live: string[], local: string[]): MigrationDrift {
  const localSet = new Set(local)
  const liveSet = new Set(live)
  const missingLocally = live.filter((name) => !localSet.has(name))
  if (missingLocally.length > 0) {
    return {
      ok: false,
      reason:
        `your local database is missing ${missingLocally.length} migration(s) live has (${missingLocally.join(', ')}). ` +
        'Pull main, run pnpm db:migrate, then try again.',
    }
  }
  return { ok: true, localAhead: local.filter((name) => !liveSet.has(name)) }
}

export type ForeignKey = {
  table: string
  column: string
  refTable: string
  refColumn: string
  /** pg_constraint.confdeltype: a no action, r restrict, c cascade, n set null, d set default */
  onDelete: string
  nullable: boolean
}

/**
 * The load runs with foreign-key triggers off, so the links between copied
 * and kept rows are fixed up by hand afterwards:
 *   - content -> private (e.g. articles.created_by_id -> users): live staff ids
 *     mean nothing locally, so the link is cleared.
 *   - private -> content (e.g. a local bookmark of an article live deleted):
 *     the local row goes, or its link is cleared, per the key's ON DELETE.
 * Links between two content tables are consistent already: pg_dump reads
 * every table from one snapshot.
 */
export function danglingLinkSql(foreignKeys: ForeignKey[]): string[] {
  const statements: string[] = []
  for (const fk of foreignKeys) {
    const fromContent = isContentTable(fk.table)
    const toContent = isContentTable(fk.refTable)
    if (fromContent === toContent) continue

    const table = `public.${quoteIdent(fk.table)}`
    const column = quoteIdent(fk.column)
    const missing = `${column} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.${quoteIdent(fk.refTable)} r WHERE r.${quoteIdent(fk.refColumn)} = ${table}.${column})`

    if (fromContent) {
      if (!fk.nullable) throw new Error(`${fk.table}.${fk.column} points at private ${fk.refTable} and cannot be cleared`)
      statements.push(`UPDATE ${table} SET ${column} = NULL WHERE ${missing};`)
    } else if (fk.onDelete === 'n' && fk.nullable) {
      statements.push(`UPDATE ${table} SET ${column} = NULL WHERE ${missing};`)
    } else {
      statements.push(`DELETE FROM ${table} WHERE ${missing};`)
    }
  }
  return statements
}

/** Runs before the dump's COPY statements, in the same transaction. */
export function preludeSql(tables: string[]): string {
  return [
    // Foreign-key checks are triggers; replica mode skips them while the
    // tables are emptied and refilled in whatever order the dump uses.
    'SET session_replication_role = replica;',
    ...tables.map((name) => `DELETE FROM public.${quoteIdent(name)};`),
  ].join('\n')
}

export function postludeSql(foreignKeys: ForeignKey[]): string {
  return [...danglingLinkSql(foreignKeys), 'SET session_replication_role = DEFAULT;'].join('\n')
}

export function isStale(lastRefreshedAt: string | null, now: number, maxAgeMs = AUTO_REFRESH_AFTER_MS): boolean {
  if (!lastRefreshedAt) return true
  const at = Date.parse(lastRefreshedAt)
  return Number.isNaN(at) || now - at >= maxAgeMs
}

export function describeAge(lastRefreshedAt: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(lastRefreshedAt)) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`
}
