import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."maps_theme" AS ENUM('blue', 'inverted');
  ALTER TABLE "location_homepages_blocks_questurian_maps_dark" ADD COLUMN "maps_theme" "maps_theme" DEFAULT 'blue';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "location_homepages_blocks_questurian_maps_dark" DROP COLUMN "maps_theme";
  DROP TYPE "public"."maps_theme";`)
}
