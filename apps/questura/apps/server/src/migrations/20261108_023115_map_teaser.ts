import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles" ADD COLUMN "map_teaser" jsonb;
  ALTER TABLE "listicle_itineraries" ADD COLUMN "map_teaser" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles" DROP COLUMN "map_teaser";
  ALTER TABLE "listicle_itineraries" DROP COLUMN "map_teaser";`)
}
