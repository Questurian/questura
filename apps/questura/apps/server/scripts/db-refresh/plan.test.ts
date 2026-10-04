import { describe, expect, it } from 'vitest'

import { compareMigrations, danglingLinkSql, isStale, preludeSql, setupRoleSql } from './plan'

const password = 'a'.repeat(32)

describe('setupRoleSql', () => {
  it('grants SELECT on content tables and the migrations table only', () => {
    const sql = setupRoleSql({ database: 'neondb', password, existingTables: ['articles', 'users', 'visitor_profiles', 'payload_migrations', 'mystery'] })
    expect(sql).toContain('GRANT SELECT ON public."articles" TO "questura_local_refresh";')
    expect(sql).toContain('GRANT SELECT ON public."payload_migrations" TO "questura_local_refresh";')
    expect(sql).not.toMatch(/GRANT SELECT ON public\."(users|visitor_profiles|mystery)"/)
    expect(sql).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "questura_local_refresh";')
    expect(sql).toContain('NOSUPERUSER')
  })

  it('leaves SUPERUSER out of ALTER ROLE, which Neon owner logins may not use', () => {
    const sql = setupRoleSql({ database: 'neondb', password, existingTables: [] })
    const alter = sql.split('\n').find((line) => line.startsWith('ALTER ROLE') && line.includes('PASSWORD'))
    expect(alter).toBeDefined()
    expect(alter).not.toMatch(/SUPERUSER/)
    expect(sql).toMatch(/CREATE ROLE "questura_local_refresh" WITH NOLOGIN NOSUPERUSER/)
  })

  it('refuses a password that could break out of the literal', () => {
    expect(() => setupRoleSql({ database: 'neondb', password: "x'; DROP ROLE y; --aaaaaaaaaaaaaa", existingTables: [] })).toThrow()
  })
})

describe('compareMigrations', () => {
  it('refuses when live has a migration the Mac lacks', () => {
    const result = compareMigrations(['a', 'b'], ['a'])
    expect(result.ok).toBe(false)
  })

  it('allows a Mac that is ahead, and says so', () => {
    expect(compareMigrations(['a'], ['a', 'b'])).toEqual({ ok: true, localAhead: ['b'] })
  })
})

describe('danglingLinkSql', () => {
  it('clears content links to private rows', () => {
    const [sql] = danglingLinkSql([
      { table: 'articles', column: 'created_by_id', refTable: 'users', refColumn: 'id', onDelete: 'n', nullable: true },
    ])
    expect(sql).toMatch(/^UPDATE public."articles" SET "created_by_id" = NULL WHERE/)
  })

  it('removes private rows whose content is gone when the key cascades', () => {
    const [sql] = danglingLinkSql([
      { table: 'bookmarks', column: 'article_id', refTable: 'articles', refColumn: 'id', onDelete: 'c', nullable: false },
    ])
    expect(sql).toMatch(/^DELETE FROM public."bookmarks" WHERE/)
  })

  it('leaves links inside content and inside private alone', () => {
    expect(
      danglingLinkSql([
        { table: 'articles_rels', column: 'parent_id', refTable: 'articles', refColumn: 'id', onDelete: 'c', nullable: false },
        { table: 'users_sessions', column: '_parent_id', refTable: 'users', refColumn: 'id', onDelete: 'c', nullable: false },
      ]),
    ).toEqual([])
  })
})

describe('preludeSql', () => {
  it('turns foreign-key triggers off before emptying the tables', () => {
    expect(preludeSql(['articles']).split('\n')).toEqual(['SET session_replication_role = replica;', 'DELETE FROM public."articles";'])
  })
})

describe('isStale', () => {
  const now = Date.parse('2026-09-29T12:00:00Z')
  it('is stale with no stamp', () => expect(isStale(null, now)).toBe(true))
  it('is fresh within six hours', () => expect(isStale('2026-09-29T07:00:00Z', now)).toBe(false))
  it('is stale after six hours', () => expect(isStale('2026-09-29T05:59:00Z', now)).toBe(true))
})
