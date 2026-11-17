import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "listicle_itineraries_blocks_itinerary_where_staying" ADD COLUMN "hide_website" boolean DEFAULT false;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" ADD COLUMN "hide_website" boolean DEFAULT false;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" ADD COLUMN "hide_website" boolean DEFAULT false;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" ADD COLUMN "hide_website" boolean DEFAULT false;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" ADD COLUMN "hide_website" boolean DEFAULT false;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" ADD COLUMN "hide_website" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "listicle_itineraries_blocks_itinerary_where_staying" DROP COLUMN "hide_website";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" DROP COLUMN "hide_website";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" DROP COLUMN "hide_website";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" DROP COLUMN "hide_website";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" DROP COLUMN "hide_website";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" DROP COLUMN "hide_website";`)
}
