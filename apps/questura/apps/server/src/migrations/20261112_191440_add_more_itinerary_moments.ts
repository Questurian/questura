import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."itinerary_moment" ADD VALUE 'seafood' BEFORE 'culture';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'soup' BEFORE 'culture';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'grill' BEFORE 'culture';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'bakery' BEFORE 'culture';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'tasting-menu' BEFORE 'culture';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'church' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'ruins' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'palace' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'bridge' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'lighthouse' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'art-gallery' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'street-art' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'literary-stop' BEFORE 'guided-tour';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'clifftop' BEFORE 'wellness-break';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'oasis' BEFORE 'wellness-break';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'wildlife' BEFORE 'wellness-break';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'pier' BEFORE 'day-trip';
  ALTER TYPE "public"."itinerary_moment" ADD VALUE 'bus-ride' BEFORE 'in-transit';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "ita" ALTER COLUMN "moment" SET DATA TYPE text;
  DROP TYPE "public"."itinerary_moment";
  CREATE TYPE "public"."itinerary_moment" AS ENUM('breakfast', 'coffee', 'morning-walk', 'remote-work', 'coworking-stop', 'lunch', 'street-food', 'sweet-treat', 'culture', 'historic-site', 'museum-visit', 'landmark', 'guided-tour', 'local-market', 'shopping', 'outdoor', 'beach-time', 'scenic-viewpoint', 'wellness-break', 'active-adventure', 'boat-ride', 'day-trip', 'in-transit', 'sunset', 'rooftop-stop', 'dinner', 'cocktails', 'drinks', 'nightlife');
  ALTER TABLE "listicle_itineraries_blocks_itinerary_dining" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_accommodations" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_attractions" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_nightlife" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";
  ALTER TABLE "listicle_itineraries_blocks_itinerary_key_location" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";
  ALTER TABLE "ita" ALTER COLUMN "moment" SET DATA TYPE "public"."itinerary_moment" USING "moment"::"public"."itinerary_moment";`)
}
