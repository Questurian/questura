import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { CONTENT_TABLES, NON_PAYLOAD_TABLES, PRIVATE_TABLES, unclassifiedTables } from './tables'

function latestSnapshotTables(): string[] {
  const dir = path.resolve(__dirname, '../../src/migrations')
  const latest = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1)
  if (!latest) throw new Error('no migration snapshot found')
  const snapshot = JSON.parse(fs.readFileSync(path.join(dir, latest), 'utf-8')) as {
    tables: Record<string, unknown>
  }
  return Object.keys(snapshot.tables).map((key) => key.replace(/^public\./, ''))
}

describe('db:refresh table lists', () => {
  it('classifies every table in the schema', () => {
    const all = [...latestSnapshotTables(), ...NON_PAYLOAD_TABLES]
    // A new collection or field added a table. Put it in CONTENT_TABLES (the
    // site shows it) or PRIVATE_TABLES (people, payments, per-database state).
    expect(unclassifiedTables(all)).toEqual([])
  })

  it('never lists a table as both content and private', () => {
    const privateSet = new Set<string>(PRIVATE_TABLES)
    expect(CONTENT_TABLES.filter((name) => privateSet.has(name))).toEqual([])
  })

  it('keeps people and payments private', () => {
    const content = new Set<string>(CONTENT_TABLES)
    for (const name of [...latestSnapshotTables(), ...NON_PAYLOAD_TABLES]) {
      if (/^(users|visitor_|stripe_|bookmarks|email_|identity_|service_accounts)/.test(name)) {
        expect(content.has(name), name).toBe(false)
      }
    }
  })
})
