import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles_blocks_data_dining" ADD COLUMN "section" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ADD COLUMN "section" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ADD COLUMN "section" varchar;
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ADD COLUMN "section" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles_blocks_data_dining" DROP COLUMN "section";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" DROP COLUMN "section";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" DROP COLUMN "section";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" DROP COLUMN "section";`)
}
