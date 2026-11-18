import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_blocks_airbnb_card" ADD COLUMN "stay_content" jsonb;
  ALTER TABLE "articles_blocks_airbnb_card" ADD COLUMN "photo_order" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_blocks_airbnb_card" DROP COLUMN "stay_content";
  ALTER TABLE "articles_blocks_airbnb_card" DROP COLUMN "photo_order";`)
}
