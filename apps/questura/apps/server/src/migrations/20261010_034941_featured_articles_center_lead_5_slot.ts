import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * 5-slot featured articles: add the `center-lead` layout and make the
 * magazine (`hero-sidebar`) the default. Additive on purpose: the generated
 * version dropped and recreated the `s5_lo` type, which is not needed to add
 * one value. `card-grid` stays in the type so stored rows keep a valid value;
 * the API reads it as `hero-sidebar`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."s5_lo" ADD VALUE IF NOT EXISTS 'center-lead';
  ALTER TABLE "location_homepages_blocks_featured_articles" ALTER COLUMN "slot5_layout" SET DEFAULT 'hero-sidebar'::"public"."s5_lo";`)
}

/**
 * Postgres cannot drop one enum value, so `center-lead` stays in the type.
 * Rows using it fall back to the magazine, which is what the old code drew.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "location_homepages_blocks_featured_articles" SET "slot5_layout" = 'hero-sidebar' WHERE "slot5_layout"::text = 'center-lead';
  ALTER TABLE "location_homepages_blocks_featured_articles" ALTER COLUMN "slot5_layout" SET DEFAULT 'card-grid'::"public"."s5_lo";`)
}
