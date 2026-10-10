import * as migration_20260514000000_promote_location_cover_image from './20260514000000_promote_location_cover_image'
import * as migration_20260514001000_drop_location_guide_storage from './20260514001000_drop_location_guide_storage'
import * as migration_20260515000000_media_set_source_focal_point from './20260515000000_media_set_source_focal_point'
import * as migration_20260528000000_itinerary_angle_and_list_tone from './20260528000000_itinerary_angle_and_list_tone'
import * as migration_20260529000000_better_auth_visitor_tables from './20260529000000_better_auth_visitor_tables'
import * as migration_20260531_003454_curated_homepage_draft_published_snapshots from './20260531_003454_curated_homepage_draft_published_snapshots'
import * as migration_20260531_005708_main_homepage_global from './20260531_005708_main_homepage_global'
import * as migration_20260531_220632_add_source_block_key from './20260531_220632_add_source_block_key'
import * as migration_20260601_103652_visitor_profiles_payload_schema from './20260601_103652_visitor_profiles_payload_schema'
import * as migration_20260612_023018_add_tour_picks_to_listicle_blocks from './20260612_023018_add_tour_picks_to_listicle_blocks'
import * as migration_20260703_132643_add_itinerary_tour_agency_block_storage from './20260703_132643_add_itinerary_tour_agency_block_storage'
import * as migration_20260704_000000_add_article_source_fields from './20260704_000000_add_article_source_fields'
import * as migration_20260708_060450_reference_grid_registry_cleanup from './20260708_060450_reference_grid_registry_cleanup'
import * as migration_20260711_000000_add_users_author_slug from './20260711_000000_add_users_author_slug'
import * as migration_20260717_000000_retire_users_public_profile_is_public from './20260717_000000_retire_users_public_profile_is_public'
import * as migration_20260717_010000_add_users_social_link_platforms from './20260717_010000_add_users_social_link_platforms'
import * as migration_20260717_020000_add_email_logs from './20260717_020000_add_email_logs'
import * as migration_20260723_060311_add_itinerary_stop_moments from './20260723_060311_add_itinerary_stop_moments'
import * as migration_20260723_180417_add_itinerary_moment_options from './20260723_180417_add_itinerary_moment_options'
import * as migration_20260724_171322_add_stripe_webhook_events from './20260724_171322_add_stripe_webhook_events'
import * as migration_20260811_000000_add_users_status from './20260811_000000_add_users_status'
import * as migration_20260811_010000_add_authors from './20260811_010000_add_authors'
import * as migration_20260811_020000_repoint_bylines_to_authors from './20260811_020000_repoint_bylines_to_authors'
import * as migration_20260811_030000_retire_users_public_profile from './20260811_030000_retire_users_public_profile'
import * as migration_20260811_040000_add_service_accounts from './20260811_040000_add_service_accounts'
import * as migration_20260812_080000_enforce_identity_email_ownership from './20260812_080000_enforce_identity_email_ownership'
import * as migration_20260813_000000_add_service_accounts_preferences_rel from './20260813_000000_add_service_accounts_preferences_rel'
import * as migration_20260813_010000_add_visitor_profile_billing_email from './20260813_010000_add_visitor_profile_billing_email'
import * as migration_20260814_010000_add_visitor_profile_paid_through from './20260814_010000_add_visitor_profile_paid_through'
import * as migration_20260814_020000_drop_legacy_membership_columns from './20260814_020000_drop_legacy_membership_columns'
import * as migration_20260814_030000_unique_visitor_profile_stripe_customer_id from './20260814_030000_unique_visitor_profile_stripe_customer_id'
import * as migration_20260815_010000_add_access_tier from './20260815_010000_add_access_tier'
import * as migration_20260816_010000_price_tier_graphql_safe_values from './20260816_010000_price_tier_graphql_safe_values'
import * as migration_20260820_010000_add_bookmarks from './20260820_010000_add_bookmarks'
import * as migration_20260821_010000_add_featured_creator_article_block from './20260821_010000_add_featured_creator_article_block'
import * as migration_20260821_161023_add_author_article_byline from './20260821_161023_add_author_article_byline'
import * as migration_20260822_041423_add_creator_kicker from './20260822_041423_add_creator_kicker'
import * as migration_20260822_143211_add_editorial_feature_homepage_block from './20260822_143211_add_editorial_feature_homepage_block'
import * as migration_20260822_204353_location_grid_card_descriptions from './20260822_204353_location_grid_card_descriptions'
import * as migration_20260822_224713_location_grid_card_kickers from './20260822_224713_location_grid_card_kickers'
import * as migration_20260823_143937_add_author_feature_images_and_block from './20260823_143937_add_author_feature_images_and_block'
import * as migration_20260823_212107_single_author_feature from './20260823_212107_single_author_feature'
import * as migration_20260823_225423_author_feature_editable_copy from './20260823_225423_author_feature_editable_copy'
import * as migration_20260823_235319_expand_single_type_listicle_angle_values from './20260823_235319_expand_single_type_listicle_angle_values'
import * as migration_20260920_120000_public_feed_indexes from './20260920_120000_public_feed_indexes'
import * as migration_20260920_140000_public_search_documents from './20260920_140000_public_search_documents'
import * as migration_20260921_214514_refresh_jobs_outbox from './20260921_214514_refresh_jobs_outbox'
import * as migration_20260922_063804_refresh_jobs_fencing from './20260922_063804_refresh_jobs_fencing'
import * as migration_20260924_145915_payload_3_90_upgrade from './20260924_145915_payload_3_90_upgrade'
import * as migration_20260925_034038_visitor_billing_interval_and_paused_flag from './20260925_034038_visitor_billing_interval_and_paused_flag'
import * as migration_20260929_222646_page_hero_and_questurian_maps_dark_blocks from './20260929_222646_page_hero_and_questurian_maps_dark_blocks'
import * as migration_20261001_012843_listicle_moment_groups from './20261001_012843_listicle_moment_groups'
import * as migration_20261004_172739_airbnbs from './20261004_172739_airbnbs'
import * as migration_20261004_184515_airbnb_card_block from './20261004_184515_airbnb_card_block'
import * as migration_20261005_170711_hotel_card_block from './20261005_170711_hotel_card_block'
import * as migration_20261005_174909_listicle_mixed_type from './20261005_174909_listicle_mixed_type'
import * as migration_20261007_163342_listicle_blurb_only_items from './20261007_163342_listicle_blurb_only_items'

import * as migration_20261008_182100_composite_photo_attribution from './20261008_182100_composite_photo_attribution'
import * as migration_20261010_034941_featured_articles_center_lead_5_slot from './20261010_034941_featured_articles_center_lead_5_slot'

export const migrations = [
  {
    up: migration_20260514000000_promote_location_cover_image.up,
    down: migration_20260514000000_promote_location_cover_image.down,
    name: '20260514000000_promote_location_cover_image',
  },
  {
    up: migration_20260514001000_drop_location_guide_storage.up,
    down: migration_20260514001000_drop_location_guide_storage.down,
    name: '20260514001000_drop_location_guide_storage',
  },
  {
    up: migration_20260515000000_media_set_source_focal_point.up,
    down: migration_20260515000000_media_set_source_focal_point.down,
    name: '20260515000000_media_set_source_focal_point',
  },
  {
    up: migration_20260528000000_itinerary_angle_and_list_tone.up,
    down: migration_20260528000000_itinerary_angle_and_list_tone.down,
    name: '20260528000000_itinerary_angle_and_list_tone',
  },
  {
    up: migration_20260529000000_better_auth_visitor_tables.up,
    down: migration_20260529000000_better_auth_visitor_tables.down,
    name: '20260529000000_better_auth_visitor_tables',
  },
  {
    up: migration_20260531_003454_curated_homepage_draft_published_snapshots.up,
    down: migration_20260531_003454_curated_homepage_draft_published_snapshots.down,
    name: '20260531_003454_curated_homepage_draft_published_snapshots',
  },
  {
    up: migration_20260531_005708_main_homepage_global.up,
    down: migration_20260531_005708_main_homepage_global.down,
    name: '20260531_005708_main_homepage_global',
  },
  {
    up: migration_20260531_220632_add_source_block_key.up,
    down: migration_20260531_220632_add_source_block_key.down,
    name: '20260531_220632_add_source_block_key',
  },
  {
    up: migration_20260601_103652_visitor_profiles_payload_schema.up,
    down: migration_20260601_103652_visitor_profiles_payload_schema.down,
    name: '20260601_103652_visitor_profiles_payload_schema',
  },
  {
    up: migration_20260612_023018_add_tour_picks_to_listicle_blocks.up,
    down: migration_20260612_023018_add_tour_picks_to_listicle_blocks.down,
    name: '20260612_023018_add_tour_picks_to_listicle_blocks',
  },
  {
    up: migration_20260703_132643_add_itinerary_tour_agency_block_storage.up,
    down: migration_20260703_132643_add_itinerary_tour_agency_block_storage.down,
    name: '20260703_132643_add_itinerary_tour_agency_block_storage',
  },
  {
    up: migration_20260704_000000_add_article_source_fields.up,
    down: migration_20260704_000000_add_article_source_fields.down,
    name: '20260704_000000_add_article_source_fields',
  },
  {
    up: migration_20260708_060450_reference_grid_registry_cleanup.up,
    down: migration_20260708_060450_reference_grid_registry_cleanup.down,
    name: '20260708_060450_reference_grid_registry_cleanup',
  },
  {
    up: migration_20260711_000000_add_users_author_slug.up,
    down: migration_20260711_000000_add_users_author_slug.down,
    name: '20260711_000000_add_users_author_slug',
  },
  {
    up: migration_20260717_000000_retire_users_public_profile_is_public.up,
    down: migration_20260717_000000_retire_users_public_profile_is_public.down,
    name: '20260717_000000_retire_users_public_profile_is_public',
  },
  {
    up: migration_20260717_010000_add_users_social_link_platforms.up,
    down: migration_20260717_010000_add_users_social_link_platforms.down,
    name: '20260717_010000_add_users_social_link_platforms',
  },
  {
    up: migration_20260717_020000_add_email_logs.up,
    down: migration_20260717_020000_add_email_logs.down,
    name: '20260717_020000_add_email_logs',
  },
  {
    up: migration_20260723_060311_add_itinerary_stop_moments.up,
    down: migration_20260723_060311_add_itinerary_stop_moments.down,
    name: '20260723_060311_add_itinerary_stop_moments',
  },
  {
    up: migration_20260723_180417_add_itinerary_moment_options.up,
    down: migration_20260723_180417_add_itinerary_moment_options.down,
    name: '20260723_180417_add_itinerary_moment_options',
  },
  {
    up: migration_20260724_171322_add_stripe_webhook_events.up,
    down: migration_20260724_171322_add_stripe_webhook_events.down,
    name: '20260724_171322_add_stripe_webhook_events',
  },
  {
    up: migration_20260811_000000_add_users_status.up,
    down: migration_20260811_000000_add_users_status.down,
    name: '20260811_000000_add_users_status',
  },
  {
    up: migration_20260811_010000_add_authors.up,
    down: migration_20260811_010000_add_authors.down,
    name: '20260811_010000_add_authors',
  },
  {
    up: migration_20260811_020000_repoint_bylines_to_authors.up,
    down: migration_20260811_020000_repoint_bylines_to_authors.down,
    name: '20260811_020000_repoint_bylines_to_authors',
  },
  {
    up: migration_20260811_030000_retire_users_public_profile.up,
    down: migration_20260811_030000_retire_users_public_profile.down,
    name: '20260811_030000_retire_users_public_profile',
  },
  {
    up: migration_20260811_040000_add_service_accounts.up,
    down: migration_20260811_040000_add_service_accounts.down,
    name: '20260811_040000_add_service_accounts',
  },
  {
    up: migration_20260812_080000_enforce_identity_email_ownership.up,
    down: migration_20260812_080000_enforce_identity_email_ownership.down,
    name: '20260812_080000_enforce_identity_email_ownership',
  },
  {
    up: migration_20260813_000000_add_service_accounts_preferences_rel.up,
    down: migration_20260813_000000_add_service_accounts_preferences_rel.down,
    name: '20260813_000000_add_service_accounts_preferences_rel',
  },
  {
    up: migration_20260813_010000_add_visitor_profile_billing_email.up,
    down: migration_20260813_010000_add_visitor_profile_billing_email.down,
    name: '20260813_010000_add_visitor_profile_billing_email',
  },
  {
    up: migration_20260814_010000_add_visitor_profile_paid_through.up,
    down: migration_20260814_010000_add_visitor_profile_paid_through.down,
    name: '20260814_010000_add_visitor_profile_paid_through',
  },
  {
    up: migration_20260814_020000_drop_legacy_membership_columns.up,
    down: migration_20260814_020000_drop_legacy_membership_columns.down,
    name: '20260814_020000_drop_legacy_membership_columns',
  },
  {
    up: migration_20260814_030000_unique_visitor_profile_stripe_customer_id.up,
    down: migration_20260814_030000_unique_visitor_profile_stripe_customer_id.down,
    name: '20260814_030000_unique_visitor_profile_stripe_customer_id',
  },
  {
    up: migration_20260815_010000_add_access_tier.up,
    down: migration_20260815_010000_add_access_tier.down,
    name: '20260815_010000_add_access_tier',
  },
  {
    up: migration_20260816_010000_price_tier_graphql_safe_values.up,
    down: migration_20260816_010000_price_tier_graphql_safe_values.down,
    name: '20260816_010000_price_tier_graphql_safe_values',
  },
  {
    up: migration_20260820_010000_add_bookmarks.up,
    down: migration_20260820_010000_add_bookmarks.down,
    name: '20260820_010000_add_bookmarks',
  },
  {
    up: migration_20260821_010000_add_featured_creator_article_block.up,
    down: migration_20260821_010000_add_featured_creator_article_block.down,
    name: '20260821_010000_add_featured_creator_article_block',
  },
  {
    up: migration_20260821_161023_add_author_article_byline.up,
    down: migration_20260821_161023_add_author_article_byline.down,
    name: '20260821_161023_add_author_article_byline',
  },
  {
    up: migration_20260822_041423_add_creator_kicker.up,
    down: migration_20260822_041423_add_creator_kicker.down,
    name: '20260822_041423_add_creator_kicker',
  },
  {
    up: migration_20260822_143211_add_editorial_feature_homepage_block.up,
    down: migration_20260822_143211_add_editorial_feature_homepage_block.down,
    name: '20260822_143211_add_editorial_feature_homepage_block',
  },
  {
    up: migration_20260822_204353_location_grid_card_descriptions.up,
    down: migration_20260822_204353_location_grid_card_descriptions.down,
    name: '20260822_204353_location_grid_card_descriptions',
  },
  {
    up: migration_20260822_224713_location_grid_card_kickers.up,
    down: migration_20260822_224713_location_grid_card_kickers.down,
    name: '20260822_224713_location_grid_card_kickers',
  },
  {
    up: migration_20260823_143937_add_author_feature_images_and_block.up,
    down: migration_20260823_143937_add_author_feature_images_and_block.down,
    name: '20260823_143937_add_author_feature_images_and_block',
  },
  {
    up: migration_20260823_212107_single_author_feature.up,
    down: migration_20260823_212107_single_author_feature.down,
    name: '20260823_212107_single_author_feature',
  },
  {
    up: migration_20260823_225423_author_feature_editable_copy.up,
    down: migration_20260823_225423_author_feature_editable_copy.down,
    name: '20260823_225423_author_feature_editable_copy',
  },
  {
    up: migration_20260823_235319_expand_single_type_listicle_angle_values.up,
    down: migration_20260823_235319_expand_single_type_listicle_angle_values.down,
    name: '20260823_235319_expand_single_type_listicle_angle_values',
  },
  {
    up: migration_20260920_120000_public_feed_indexes.up,
    down: migration_20260920_120000_public_feed_indexes.down,
    name: '20260920_120000_public_feed_indexes',
  },
  {
    up: migration_20260920_140000_public_search_documents.up,
    down: migration_20260920_140000_public_search_documents.down,
    name: '20260920_140000_public_search_documents',
  },
  {
    up: migration_20260921_214514_refresh_jobs_outbox.up,
    down: migration_20260921_214514_refresh_jobs_outbox.down,
    name: '20260921_214514_refresh_jobs_outbox',
  },
  {
    up: migration_20260922_063804_refresh_jobs_fencing.up,
    down: migration_20260922_063804_refresh_jobs_fencing.down,
    name: '20260922_063804_refresh_jobs_fencing',
  },
  {
    up: migration_20260924_145915_payload_3_90_upgrade.up,
    down: migration_20260924_145915_payload_3_90_upgrade.down,
    name: '20260924_145915_payload_3_90_upgrade',
  },
  {
    up: migration_20260925_034038_visitor_billing_interval_and_paused_flag.up,
    down: migration_20260925_034038_visitor_billing_interval_and_paused_flag.down,
    name: '20260925_034038_visitor_billing_interval_and_paused_flag',
  },
  {
    up: migration_20260929_222646_page_hero_and_questurian_maps_dark_blocks.up,
    down: migration_20260929_222646_page_hero_and_questurian_maps_dark_blocks.down,
    name: '20260929_222646_page_hero_and_questurian_maps_dark_blocks',
  },
  {
    up: migration_20261001_012843_listicle_moment_groups.up,
    down: migration_20261001_012843_listicle_moment_groups.down,
    name: '20261001_012843_listicle_moment_groups',
  },
  {
    up: migration_20261004_172739_airbnbs.up,
    down: migration_20261004_172739_airbnbs.down,
    name: '20261004_172739_airbnbs',
  },
  {
    up: migration_20261004_184515_airbnb_card_block.up,
    down: migration_20261004_184515_airbnb_card_block.down,
    name: '20261004_184515_airbnb_card_block',
  },
  {
    up: migration_20261005_170711_hotel_card_block.up,
    down: migration_20261005_170711_hotel_card_block.down,
    name: '20261005_170711_hotel_card_block',
  },
  {
    up: migration_20261005_174909_listicle_mixed_type.up,
    down: migration_20261005_174909_listicle_mixed_type.down,
    name: '20261005_174909_listicle_mixed_type',
  },
  {
    up: migration_20261007_163342_listicle_blurb_only_items.up,
    down: migration_20261007_163342_listicle_blurb_only_items.down,
    name: '20261007_163342_listicle_blurb_only_items',
  },
  {
    up: migration_20261008_182100_composite_photo_attribution.up,
    down: migration_20261008_182100_composite_photo_attribution.down,
    name: '20261008_182100_composite_photo_attribution',
  },
  {
    up: migration_20261010_034941_featured_articles_center_lead_5_slot.up,
    down: migration_20261010_034941_featured_articles_center_lead_5_slot.down,
    name: '20261010_034941_featured_articles_center_lead_5_slot',
  },
]
