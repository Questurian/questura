import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lh_blocks_destination_header_layout" AS ENUM('band', 'split');
  ALTER TABLE "location_homepages_blocks_destination_header" ADD COLUMN "destination_layout" "enum_lh_blocks_destination_header_layout" DEFAULT 'band';
  ALTER TABLE "location_homepages_blocks_destination_header" ADD COLUMN "destination_focus_x" numeric DEFAULT 50;
  ALTER TABLE "location_homepages_blocks_destination_header" ADD COLUMN "destination_focus_y" numeric DEFAULT 50;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "location_homepages_blocks_destination_header" DROP COLUMN "destination_layout";
  ALTER TABLE "location_homepages_blocks_destination_header" DROP COLUMN "destination_focus_x";
  ALTER TABLE "location_homepages_blocks_destination_header" DROP COLUMN "destination_focus_y";
  DROP TYPE "public"."enum_lh_blocks_destination_header_layout";`)
}
