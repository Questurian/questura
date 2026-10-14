import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_location_homepages_blocks_editorial_feature_feature_flag" AS ENUM('PE', 'CO', 'MX');
  CREATE TYPE "public"."enum_location_homepages_blocks_editorial_feature_feature_theme" AS ENUM('light', 'dark');
  ALTER TABLE "location_homepages_blocks_editorial_feature" ADD COLUMN "feature_flag" "enum_location_homepages_blocks_editorial_feature_feature_flag";
  ALTER TABLE "location_homepages_blocks_editorial_feature" ADD COLUMN "feature_theme" "enum_location_homepages_blocks_editorial_feature_feature_theme" DEFAULT 'light';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "location_homepages_blocks_editorial_feature" DROP COLUMN "feature_flag";
  ALTER TABLE "location_homepages_blocks_editorial_feature" DROP COLUMN "feature_theme";
  DROP TYPE "public"."enum_location_homepages_blocks_editorial_feature_feature_flag";
  DROP TYPE "public"."enum_location_homepages_blocks_editorial_feature_feature_theme";`)
}
