import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."al_layout" AS ENUM('standard', 'square-with-ad');
  ALTER TABLE "location_homepages_blocks_article_list" ADD COLUMN "article_list_layout" "al_layout" DEFAULT 'standard';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "location_homepages_blocks_article_list" DROP COLUMN "article_list_layout";
  DROP TYPE "public"."al_layout";`)
}
