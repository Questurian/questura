import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Heading detail on single-type listicle items: an optional short line under the numbered name.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "single_type_listicles_blocks_data_dining" ADD COLUMN IF NOT EXISTS "heading_detail" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ADD COLUMN IF NOT EXISTS "heading_detail" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ADD COLUMN IF NOT EXISTS "heading_detail" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ADD COLUMN IF NOT EXISTS "heading_detail" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "single_type_listicles_blocks_data_dining" DROP COLUMN IF EXISTS "heading_detail";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" DROP COLUMN IF EXISTS "heading_detail";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" DROP COLUMN IF EXISTS "heading_detail";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" DROP COLUMN IF EXISTS "heading_detail";`)
}
