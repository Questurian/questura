import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Generated with one more statement, dropped by hand: `ALTER COLUMN
// "slot_count" SET DEFAULT 6` on location_homepages_blocks_questurian_maps_dark.
// That is drift from #27 (code default 6, column created with DEFAULT 4), not
// part of moment groups. Payload always writes slotCount itself, so the column
// default is never used, and the deploy guard refuses any ALTER COLUMN. The
// snapshot keeps 6 so the drift is not generated again.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."listicle_moment" AS ENUM('with-a-view', 'rooftop', 'by-the-water', 'on-a-budget', 'splurge', 'date-night', 'local-favorite', 'hidden-gem', 'family-friendly', 'big-groups', 'wellness', 'shows', 'fine-dining', 'special-occasion', 'tasting-menu', 'chef-driven', 'old-school-classic', 'new-and-buzzy', 'quick-lunch', 'street-food', 'markets-food-halls', 'casual', 'breakfast', 'brunch', 'coffee', 'bakeries', 'sweets', 'seafood', 'grill', 'pizza', 'noodles-soups', 'plant-based', 'healthy', 'outdoor-seating', 'late-night-eats', 'laptop-friendly', 'wine-lovers', 'big-loud-venues', 'live-bands', 'live-music', 'house-techno', 'dj-sets', 'latin-nights', 'jazz-blues', 'karaoke', 'dance-floors', 'local-hotspot', 'cocktail-bars', 'wine-bars', 'craft-beer', 'dive-bars', 'speakeasies', 'chill-lounges', 'lgbtq-friendly', 'after-hours', 'early-evening', 'sports-bars', 'games-bars', 'must-see', 'museums', 'history', 'art-galleries', 'architecture', 'sacred-sites', 'parks-gardens', 'nature', 'beaches', 'markets', 'shopping', 'free', 'rainy-day', 'adventure', 'on-the-water', 'day-trips', 'tours', 'walks', 'photo-spots', 'sunset-spots', 'luxury', 'boutique', 'design-hotels', 'historic-stays', 'good-value', 'hostels', 'apartments', 'romantic', 'beachfront', 'with-a-pool', 'central', 'quiet-escape', 'eco-stays', 'pet-friendly', 'adults-only', 'all-inclusive', 'long-stays', 'remote-work', 'near-airport', 'business');
  ALTER TABLE "single_type_listicles_blocks_data_dining" ADD COLUMN "moment" "listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ADD COLUMN "moment" "listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ADD COLUMN "moment" "listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ADD COLUMN "moment" "listicle_moment";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles_blocks_data_dining" DROP COLUMN "moment";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" DROP COLUMN "moment";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" DROP COLUMN "moment";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" DROP COLUMN "moment";
  DROP TYPE "public"."listicle_moment";`)
}
