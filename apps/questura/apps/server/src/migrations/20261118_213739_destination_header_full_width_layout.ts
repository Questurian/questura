import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_lh_blocks_destination_header_layout" ADD VALUE 'full';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "location_homepages_blocks_destination_header" ALTER COLUMN "destination_layout" SET DATA TYPE text;
  ALTER TABLE "location_homepages_blocks_destination_header" ALTER COLUMN "destination_layout" SET DEFAULT 'band'::text;
  DROP TYPE "public"."enum_lh_blocks_destination_header_layout";
  CREATE TYPE "public"."enum_lh_blocks_destination_header_layout" AS ENUM('band', 'split', 'editorial');
  ALTER TABLE "location_homepages_blocks_destination_header" ALTER COLUMN "destination_layout" SET DEFAULT 'band'::"public"."enum_lh_blocks_destination_header_layout";
  ALTER TABLE "location_homepages_blocks_destination_header" ALTER COLUMN "destination_layout" SET DATA TYPE "public"."enum_lh_blocks_destination_header_layout" USING "destination_layout"::"public"."enum_lh_blocks_destination_header_layout";`)
}
