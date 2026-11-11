import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" ADD COLUMN "stop_notes" jsonb;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" ADD COLUMN "stop_notes" jsonb;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" ADD COLUMN "stop_notes" jsonb;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" ADD COLUMN "stop_notes" jsonb;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" ADD COLUMN "stop_notes" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" DROP COLUMN "stop_notes";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" DROP COLUMN "stop_notes";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" DROP COLUMN "stop_notes";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" DROP COLUMN "stop_notes";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" DROP COLUMN "stop_notes";`)
}
