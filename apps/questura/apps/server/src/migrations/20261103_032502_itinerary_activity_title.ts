import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" ADD COLUMN "activity_title" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" DROP COLUMN "activity_title";`)
}
