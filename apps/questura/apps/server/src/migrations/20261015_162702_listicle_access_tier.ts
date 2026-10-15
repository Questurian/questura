import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Access tier back on single-type listicles (owner decision, 2026-10-15).
 *
 * Hand-edited from the generated CREATE TYPE / ADD COLUMN. The column and its
 * enum already exist on every database built by migration: they came with
 * 20260815_010000_add_access_tier and were never dropped when the field left
 * the collection config, so the generated statements would fail on "already
 * exists". Written to be idempotent, like that migration, then the default
 * moved to `member` so new listicles start behind the paywall.
 *
 * Existing rows keep the value they hold (all `free` on live). Switching them
 * is an editorial act done after deploy, not a data rewrite in a migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_single_type_listicles_access" AS ENUM('free', 'member');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "single_type_listicles"
    ADD COLUMN IF NOT EXISTS "access" "public"."enum_single_type_listicles_access" DEFAULT 'member' NOT NULL;`)

  await db.execute(sql`
    ALTER TABLE "single_type_listicles" ALTER COLUMN "access" SET DEFAULT 'member';`)
}

/**
 * Back to the state before this migration: the column stays (it predates this
 * migration), only its default returns to `free`.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "single_type_listicles" ALTER COLUMN "access" SET DEFAULT 'free';`)
}
