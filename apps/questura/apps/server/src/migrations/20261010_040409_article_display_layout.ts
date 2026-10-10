import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_display_layout" AS ENUM('classic', 'dark-hero', 'centered');
  ALTER TABLE "articles" ADD COLUMN "display_layout" "enum_articles_display_layout" DEFAULT 'classic';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" DROP COLUMN "display_layout";
  DROP TYPE "public"."enum_articles_display_layout";`)
}
