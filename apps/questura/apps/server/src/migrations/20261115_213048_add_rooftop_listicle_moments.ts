import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."listicle_moment" ADD VALUE 'locals-rooftops';
  ALTER TYPE "public"."listicle_moment" ADD VALUE 'party-rooftops';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles_blocks_data_dining" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ALTER COLUMN "moment" SET DATA TYPE text;
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ALTER COLUMN "moment" SET DATA TYPE text;
  DROP TYPE "public"."listicle_moment";
  CREATE TYPE "public"."listicle_moment" AS ENUM('with-a-view', 'rooftop', 'by-the-water', 'on-a-budget', 'splurge', 'date-night', 'local-favorite', 'hidden-gem', 'family-friendly', 'big-groups', 'wellness', 'shows', 'fine-dining', 'special-occasion', 'tasting-menu', 'chef-driven', 'old-school-classic', 'new-and-buzzy', 'quick-lunch', 'street-food', 'markets-food-halls', 'casual', 'breakfast', 'brunch', 'coffee', 'bakeries', 'sweets', 'seafood', 'grill', 'pizza', 'noodles-soups', 'plant-based', 'healthy', 'outdoor-seating', 'late-night-eats', 'laptop-friendly', 'wine-lovers', 'big-loud-venues', 'live-bands', 'live-music', 'house-techno', 'dj-sets', 'latin-nights', 'jazz-blues', 'karaoke', 'dance-floors', 'local-hotspot', 'cocktail-bars', 'wine-bars', 'craft-beer', 'dive-bars', 'speakeasies', 'chill-lounges', 'lgbtq-friendly', 'after-hours', 'early-evening', 'sports-bars', 'games-bars', 'must-see', 'museums', 'history', 'art-galleries', 'architecture', 'sacred-sites', 'parks-gardens', 'nature', 'beaches', 'markets', 'shopping', 'free', 'rainy-day', 'adventure', 'on-the-water', 'day-trips', 'tours', 'walks', 'photo-spots', 'sunset-spots', 'luxury', 'boutique', 'design-hotels', 'historic-stays', 'good-value', 'hostels', 'apartments', 'romantic', 'beachfront', 'with-a-pool', 'central', 'quiet-escape', 'eco-stays', 'pet-friendly', 'adults-only', 'all-inclusive', 'long-stays', 'remote-work', 'near-airport', 'business');
  ALTER TABLE "single_type_listicles_blocks_data_dining" ALTER COLUMN "moment" SET DATA TYPE "public"."listicle_moment" USING "moment"::"public"."listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_accommodations" ALTER COLUMN "moment" SET DATA TYPE "public"."listicle_moment" USING "moment"::"public"."listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_attractions" ALTER COLUMN "moment" SET DATA TYPE "public"."listicle_moment" USING "moment"::"public"."listicle_moment";
  ALTER TABLE "single_type_listicles_blocks_data_nightlife" ALTER COLUMN "moment" SET DATA TYPE "public"."listicle_moment" USING "moment"::"public"."listicle_moment";`)
}
