import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  assessMigration,
  buildMigrationPlan,
  inspectMigration,
  parseRegisteredMigrationNames,
} from './check-pending-migrations.mjs'

const scriptRoot = path.dirname(fileURLToPath(import.meta.url))
const migrationsRoot = path.resolve(scriptRoot, '../../src/migrations')

test('reads static registered migrations in deployment order', () => {
  const source = `
    export const migrations = [
      { up: first.up, down: first.down, name: 'first' },
      { up: second.up, down: second.down, name: 'second' },
    ]
  `

  assert.deepEqual(parseRegisteredMigrationNames(source), ['first', 'second'])
  assert.throws(
    () => parseRegisteredMigrationNames('export const migrations = [dynamicMigration]'),
    /not a static object/,
  )
})

test('parses every migration registered by the real index', async () => {
  const source = await fs.readFile(path.join(migrationsRoot, 'index.ts'), 'utf8')
  const names = parseRegisteredMigrationNames(source)

  assert.ok(names.length > 0)
  assert.equal(new Set(names).size, names.length)
  await Promise.all(names.map((name) => fs.access(path.join(migrationsRoot, `${name}.ts`))))
})

test('scans only up() and ignores destructive rollback SQL', () => {
  const source = `
    export async function up() { await db.execute(sql.raw('CREATE TABLE example (id int)')) }
    export async function down() { await db.execute(sql.raw('DROP TABLE example')) }
  `

  assert.deepEqual(assessMigration(source, 'example'), [])
})

test('classifies destructive SQL, data rewrites, and auth schema changes', () => {
  const cases = [
    ['DELETE FROM users', 'destructive SQL'],
    ['UPDATE "users" SET "role" = \'admin\';', 'data rewrite'],
    ['WITH ids AS (SELECT id FROM users) UPDATE users SET role = \'admin\';', 'data rewrite'],
    ['DO $$ BEGIN UPDATE users SET role = \'admin\'; END $$;', 'data rewrite'],
    ['ALTER TABLE users ALTER COLUMN email SET NOT NULL', 'column or table rewrite'],
    ['ALTER TYPE status RENAME VALUE \'archived\' TO \'hidden\'', 'type rewrite'],
    ['ALTER TABLE visitor_auth_users ADD COLUMN example text', 'visitor auth schema'],
  ]

  for (const [sql, expectedRisk] of cases) {
    const source = `export async function up() { await db.execute(sql.raw(\`${sql}\`)) }
      export async function down() {}`
    assert.ok(assessMigration(source, 'example').includes(expectedRisk), sql)
  }
})

function migrationRunning(sql) {
  return `export async function up() { await db.execute(sql\`${sql}\`) }
    export async function down() {}`
}

test('allows adding a value to an existing enum', async () => {
  const additions = [
    'ALTER TYPE status ADD VALUE \'archived\'',
    'ALTER TYPE "public"."enum_single_type_listicles_listicle_type" ADD VALUE \'mixed\';',
    'ALTER TYPE public.status ADD VALUE IF NOT EXISTS \'archived\' BEFORE \'deleted\';',
    'alter type "status" add value \'owner\'\'s pick\' after \'draft\';\n  ALTER TYPE "status" ADD VALUE \'archived\';',
  ]
  for (const sql of additions) {
    assert.deepEqual(assessMigration(migrationRunning(sql), 'example'), [], sql)
  }

  const name = '20261005_174909_listicle_mixed_type'
  const source = await fs.readFile(path.join(migrationsRoot, `${name}.ts`), 'utf8')
  assert.deepEqual(assessMigration(source, name), [])
})

test('still blocks renaming or removing enum values', () => {
  const renames = [
    'ALTER TYPE status RENAME VALUE \'archived\' TO \'hidden\';',
    'ALTER TYPE "public"."status" RENAME TO "old_status";',
    'ALTER TYPE status SET SCHEMA private;',
    // A safe addition does not wave through the rename beside it.
    'ALTER TYPE status ADD VALUE \'archived\'; ALTER TYPE status RENAME VALUE \'draft\' TO \'wip\';',
    // Not a plain quoted value: the guard cannot vouch for what it adds.
    'ALTER TYPE status ADD VALUE archived;',
    'ALTER TYPE status ADD VALUE \'archived\' CASCADE;',
  ]
  for (const sql of renames) {
    assert.ok(assessMigration(migrationRunning(sql), 'example').includes('type rewrite'), sql)
  }

  // Postgres cannot drop one enum value, so Payload rebuilds the type. That is
  // the down() of the mixed-type migration, run here as if it were an up().
  const removal = `
    ALTER TABLE "single_type_listicles" ALTER COLUMN "listicle_type" SET DATA TYPE text;
    DROP TYPE "public"."enum_single_type_listicles_listicle_type";
    CREATE TYPE "public"."enum_single_type_listicles_listicle_type" AS ENUM('dining', 'accommodations', 'attractions', 'nightlife');
    ALTER TABLE "single_type_listicles" ALTER COLUMN "listicle_type" SET DATA TYPE "public"."enum_single_type_listicles_listicle_type" USING "listicle_type"::"public"."enum_single_type_listicles_listicle_type";`
  const risks = assessMigration(migrationRunning(removal), 'example')
  assert.ok(risks.includes('destructive SQL'), 'DROP TYPE')
  assert.ok(risks.includes('column or table rewrite'), 'ALTER COLUMN')
})

test('allows letting a column hold NULL', async () => {
  const loosenings = [
    'ALTER TABLE "articles" ALTER COLUMN "location" DROP NOT NULL;',
    'alter table if exists only public.articles alter location drop not null',
    'ALTER TABLE "a" ALTER COLUMN "b" DROP NOT NULL;\n  ALTER TABLE "c" ALTER COLUMN "d" DROP NOT NULL;',
  ]
  for (const sql of loosenings) {
    assert.deepEqual(assessMigration(migrationRunning(sql), 'example'), [], sql)
  }

  const name = '20261013_132021_articles_location_optional'
  const source = await fs.readFile(path.join(migrationsRoot, `${name}.ts`), 'utf8')
  assert.deepEqual(assessMigration(source, name), [])
})

test('still blocks every other column change, even beside a DROP NOT NULL', () => {
  const rewrites = [
    'ALTER TABLE "articles" ALTER COLUMN "location" SET NOT NULL;',
    'ALTER TABLE "articles" ALTER COLUMN "location" SET DATA TYPE varchar(40);',
    // Chained in one statement: the guard cannot vouch for the rest.
    'ALTER TABLE "articles" ALTER COLUMN "location" DROP NOT NULL, ALTER COLUMN "slug" SET NOT NULL;',
    'ALTER TABLE "articles" ALTER COLUMN "slug" SET NOT NULL, ALTER COLUMN "location" DROP NOT NULL;',
    // A safe statement does not wave through the one beside it.
    'ALTER TABLE "a" ALTER COLUMN "b" DROP NOT NULL; ALTER TABLE "a" RENAME COLUMN "b" TO "c";',
  ]
  for (const sql of rewrites) {
    assert.ok(assessMigration(migrationRunning(sql), 'example').includes('column or table rewrite'), sql)
  }

  const chainedDrop = 'ALTER TABLE "a" ALTER COLUMN "b" DROP NOT NULL, DROP COLUMN "c";'
  assert.ok(assessMigration(migrationRunning(chainedDrop), 'example').includes('destructive SQL'))
  const besideDrop = 'ALTER TABLE "a" ALTER COLUMN "b" DROP NOT NULL; DROP TABLE "c";'
  assert.ok(assessMigration(migrationRunning(besideDrop), 'example').includes('destructive SQL'))
})

test('allows changing a column default to a constant', async () => {
  const defaults = [
    'ALTER TABLE "articles" ALTER COLUMN "location" SET DEFAULT \'peru\';',
    'alter table if exists only public.articles alter access set default \'member\'',
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\'::"public"."enum_a_b";',
    'ALTER TABLE "a" ALTER COLUMN "n" SET DEFAULT -2.5;',
    'ALTER TABLE "a" ALTER COLUMN "flag" SET DEFAULT false;',
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\';\n  ALTER TABLE "c" ALTER COLUMN "d" DROP NOT NULL;',
  ]
  for (const sql of defaults) {
    assert.deepEqual(assessMigration(migrationRunning(sql), 'example'), [], sql)
  }

  const name = '20261015_075516_access_default_member'
  const source = await fs.readFile(path.join(migrationsRoot, `${name}.ts`), 'utf8')
  assert.deepEqual(assessMigration(source, name), [])
})

test('still blocks a default the guard cannot read, or anything chained to one', () => {
  const rewrites = [
    // Expressions: the guard cannot say what they do.
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT now();',
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT nextval(\'a_b_seq\');',
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\' || now();',
    // Chained in one statement, either order.
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\', ALTER COLUMN "c" SET NOT NULL;',
    'ALTER TABLE "a" ALTER COLUMN "c" SET NOT NULL, ALTER COLUMN "b" SET DEFAULT \'x\';',
    // A safe statement does not wave through the one beside it.
    'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\'; ALTER TABLE "a" RENAME COLUMN "b" TO "c";',
  ]
  for (const sql of rewrites) {
    assert.ok(assessMigration(migrationRunning(sql), 'example').includes('column or table rewrite'), sql)
  }

  const besideUpdate = 'ALTER TABLE "a" ALTER COLUMN "b" SET DEFAULT \'x\'; UPDATE "a" SET "b" = \'x\';'
  assert.ok(assessMigration(migrationRunning(besideUpdate), 'example').includes('data rewrite'))
  const dropDefault = 'ALTER TABLE "a" ALTER COLUMN "b" DROP DEFAULT;'
  assert.ok(assessMigration(migrationRunning(dropDefault), 'example').length > 0)
})

test('fails closed when db.execute SQL cannot be statically inspected', () => {
  const source = `
    export async function up() { const query = makeQuery(); await db.execute(query) }
    export async function down() {}
  `

  assert.deepEqual(inspectMigration(source, 'dynamic'), {
    risks: ['dynamic SQL cannot be inspected', 'dynamic migration logic cannot be inspected'],
    unknownExecutionLines: [2],
    unknownCallLines: [2],
  })
})

test('fails closed on interpolated SQL and helper calls', () => {
  const source = `
    export async function up() {
      await db.execute(sql.raw(\`ALTER TABLE \${table} ADD COLUMN value text\`))
      await migrateRows(db)
    }
    export async function down() {}
  `

  const inspection = inspectMigration(source, 'dynamic')
  assert.ok(inspection.risks.includes('dynamic SQL cannot be inspected'))
  assert.ok(inspection.risks.includes('dynamic migration logic cannot be inspected'))
})

test('allows additive foreign keys with ON DELETE and ON UPDATE clauses', async () => {
  const source = await fs.readFile(
    path.join(migrationsRoot, '20260813_000000_add_service_accounts_preferences_rel.ts'),
    'utf8',
  )

  assert.deepEqual(
    assessMigration(source, '20260813_000000_add_service_accounts_preferences_rel'),
    [],
  )
})

test('plans only unapplied migrations and refuses missing source files', () => {
  const safe = `export async function up() {}
    export async function down() { sql.raw('DROP TABLE old') }`
  const migrationSources = new Map([['second', safe]])

  assert.deepEqual(
    buildMigrationPlan({
      registeredNames: ['first', 'second'],
      appliedNames: ['first'],
      migrationSources,
    }),
    [{ name: 'second', risks: [], unknownExecutionLines: [], unknownCallLines: [] }],
  )

  assert.throws(
    () => buildMigrationPlan({
      registeredNames: ['missing'],
      appliedNames: [],
      migrationSources: new Map(),
    }),
    /Registered migration file is missing/,
  )
})
