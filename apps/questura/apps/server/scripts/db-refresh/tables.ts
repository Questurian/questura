/**
 * Which tables `pnpm db:refresh` copies from live into the Mac's database.
 *
 * Every table in the database is exactly one of:
 *   - CONTENT: what the site shows. Copied from live, replacing the local rows.
 *   - PRIVATE: people and their activity (staff logins, readers, members,
 *     payments, email) plus local bookkeeping. Never copied, never readable by
 *     the refresh login on live, and never touched locally, so local test
 *     accounts survive a refresh.
 *
 * A table in neither list is not copied, and `pnpm db:refresh` names it so
 * someone decides. `tables.test.ts` fails when a Payload collection adds a
 * table nobody has classified. After adding a CONTENT table, run
 * `pnpm db:refresh:setup` again so the live login is allowed to read it.
 */

export const CONTENT_TABLES = [
  'accommodations',
  'accommodations_gallery',
  'accommodations_instagram_gallery',
  'accommodations_the_experience_jacuzzi',
  'accommodations_the_experience_pool',
  'accommodations_the_experience_vibe',
  'accommodations_the_stay_parking',
  'accommodations_the_stay_perfect_for',
  'affiliate_products',
  'airbnbs',
  'airbnbs_gallery',
  'article_categories',
  'article_redirects',
  'article_tags',
  'articles',
  'articles_blocks_airbnb_card',
  'articles_blocks_faq',
  'articles_blocks_faq_items',
  'articles_blocks_highlight_callout',
  'articles_blocks_image',
  'articles_blocks_img_pair',
  'articles_blocks_img_trio',
  'articles_blocks_in_the_know',
  'articles_blocks_key_takeaway',
  'articles_blocks_key_takeaway_items',
  'articles_blocks_pull_quote',
  'articles_blocks_text',
  'articles_rels',
  'attractions',
  'attractions_gallery',
  'attractions_instagram_gallery',
  'attractions_rels',
  'authors',
  'authors_article_byline_featured_links',
  'authors_author_images',
  'authors_expertise',
  'currencies',
  'currencies_regions',
  'currencies_used_in',
  'dining',
  'dining_gallery',
  'dining_instagram_gallery',
  'instagram_posts',
  'ita',
  'key_locations',
  'key_locations_gallery',
  'key_locations_instagram_gallery',
  'kls',
  'listicle_itineraries',
  'listicle_itineraries_blocks_itinerary_accommodations',
  'listicle_itineraries_blocks_itinerary_attractions',
  'listicle_itineraries_blocks_itinerary_dining',
  'listicle_itineraries_blocks_itinerary_key_location',
  'listicle_itineraries_blocks_itinerary_nightlife',
  'listicle_itineraries_blocks_itinerary_where_staying',
  'listicle_itineraries_itinerary_days',
  'listicle_itineraries_rels',
  'location_homepages',
  'location_homepages_blocks_article_grid',
  'location_homepages_blocks_article_list',
  'location_homepages_blocks_author_feature',
  'location_homepages_blocks_author_feature_author_cards',
  'location_homepages_blocks_author_feature_selected_expertise',
  'location_homepages_blocks_editorial_feature',
  'location_homepages_blocks_featured_article',
  'location_homepages_blocks_featured_article_carousel',
  'location_homepages_blocks_featured_articles',
  'location_homepages_blocks_featured_creator_article',
  'location_homepages_blocks_hotel_grid',
  'location_homepages_blocks_location_grid',
  'location_homepages_blocks_newsletter_signup',
  'location_homepages_blocks_page_hero',
  'location_homepages_blocks_questurian_maps',
  'location_homepages_blocks_questurian_maps_dark',
  'location_homepages_blocks_things_to_do_attractions',
  'location_homepages_blocks_things_to_do_listicles',
  'location_homepages_blocks_tour_grid',
  'location_homepages_blocks_where_to_eat_drink',
  'location_homepages_rels',
  'locations',
  'main_homepage',
  'media_assets',
  'media_assets_rels',
  'media_sets',
  'media_sets_rels',
  'nightlife',
  'nightlife_gallery',
  'nightlife_instagram_gallery',
  'nightlife_texts',
  'perfect_for_tags',
  'perfect_for_tags_applicable_types',
  // Built from published articles; copying it keeps local search in step.
  'public_search_documents',
  'single_type_listicles',
  'single_type_listicles_blocks_data_accommodations',
  'single_type_listicles_blocks_data_attractions',
  'single_type_listicles_blocks_data_dining',
  'single_type_listicles_blocks_data_nightlife',
  'single_type_listicles_rels',
  'tours',
] as const

export const PRIVATE_TABLES = [
  // Staff logins. Content rows that point at a live staff user lose that
  // link locally (the columns are all ON DELETE SET NULL).
  'users',
  'users_sessions',
  'service_accounts',
  // Readers and members.
  'visitor_auth_accounts',
  'visitor_auth_rate_limits',
  'visitor_auth_sessions',
  'visitor_auth_users',
  'visitor_auth_verifications',
  'visitor_profiles',
  'identity_email_owners',
  'bookmarks',
  // Payments and mail.
  'stripe_webhook_events',
  'email_logs',
  // Admin-panel state and background work, specific to each database.
  'payload_kv',
  'payload_locked_documents',
  'payload_locked_documents_rels',
  'payload_preferences',
  'payload_preferences_rels',
  'refresh_jobs',
  // Compared, never copied: a refresh only runs when both sides agree.
  'payload_migrations',
] as const

/** Tables created by hand-written SQL migrations, so absent from Payload's schema snapshot. */
export const NON_PAYLOAD_TABLES = [
  'identity_email_owners',
  'public_search_documents',
  'visitor_auth_accounts',
  'visitor_auth_rate_limits',
  'visitor_auth_sessions',
  'visitor_auth_users',
  'visitor_auth_verifications',
] as const

/** The one private table the refresh login may read: to compare schema versions. */
export const MIGRATIONS_TABLE = 'payload_migrations'

const content = new Set<string>(CONTENT_TABLES)
const privateTables = new Set<string>(PRIVATE_TABLES)

export function isContentTable(name: string): boolean {
  return content.has(name)
}

export function isPrivateTable(name: string): boolean {
  return privateTables.has(name)
}

/** Tables in `names` that are in neither list. */
export function unclassifiedTables(names: Iterable<string>): string[] {
  return [...names].filter((name) => !content.has(name) && !privateTables.has(name)).sort()
}
