import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Quick picks on single-type listicle items: an optional label and one-line note.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "single_type_listicles_blocks_data_dining" ADD COLUMN IF NOT EXISTS "pick" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_dining" ADD COLUMN IF NOT EXISTS "pick_note" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ADD COLUMN IF NOT EXISTS "pick" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ADD COLUMN IF NOT EXISTS "pick_note" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ADD COLUMN IF NOT EXISTS "pick" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ADD COLUMN IF NOT EXISTS "pick_note" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ADD COLUMN IF NOT EXISTS "pick" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ADD COLUMN IF NOT EXISTS "pick_note" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "single_type_listicles_blocks_data_dining" DROP COLUMN IF EXISTS "pick";
  ALTER TABLE "single_type_listicles_blocks_data_dining" DROP COLUMN IF EXISTS "pick_note";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" DROP COLUMN IF EXISTS "pick";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" DROP COLUMN IF EXISTS "pick_note";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" DROP COLUMN IF EXISTS "pick";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" DROP COLUMN IF EXISTS "pick_note";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" DROP COLUMN IF EXISTS "pick";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" DROP COLUMN IF EXISTS "pick_note";`)
}
