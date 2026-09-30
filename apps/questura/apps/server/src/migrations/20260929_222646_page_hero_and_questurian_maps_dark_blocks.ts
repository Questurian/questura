import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "location_homepages_blocks_questurian_maps_dark" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot_count" numeric DEFAULT 4 NOT NULL,
  	"section_heading" varchar,
  	"section_subheading" varchar,
  	"source_block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "location_homepages_blocks_page_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot_count" numeric DEFAULT 0 NOT NULL,
  	"section_heading" varchar,
  	"section_subheading" varchar,
  	"hero_media_set_id" integer,
  	"source_block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "location_homepages_blocks_questurian_maps_dark" ADD CONSTRAINT "location_homepages_blocks_questurian_maps_dark_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."location_homepages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "location_homepages_blocks_page_hero" ADD CONSTRAINT "location_homepages_blocks_page_hero_hero_media_set_id_media_sets_id_fk" FOREIGN KEY ("hero_media_set_id") REFERENCES "public"."media_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "location_homepages_blocks_page_hero" ADD CONSTRAINT "location_homepages_blocks_page_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."location_homepages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "location_homepages_blocks_questurian_maps_dark_order_idx" ON "location_homepages_blocks_questurian_maps_dark" USING btree ("_order");
  CREATE INDEX "location_homepages_blocks_questurian_maps_dark_parent_id_idx" ON "location_homepages_blocks_questurian_maps_dark" USING btree ("_parent_id");
  CREATE INDEX "location_homepages_blocks_questurian_maps_dark_path_idx" ON "location_homepages_blocks_questurian_maps_dark" USING btree ("_path");
  CREATE INDEX "location_homepages_blocks_page_hero_order_idx" ON "location_homepages_blocks_page_hero" USING btree ("_order");
  CREATE INDEX "location_homepages_blocks_page_hero_parent_id_idx" ON "location_homepages_blocks_page_hero" USING btree ("_parent_id");
  CREATE INDEX "location_homepages_blocks_page_hero_path_idx" ON "location_homepages_blocks_page_hero" USING btree ("_path");
  CREATE INDEX "location_homepages_blocks_page_hero_hero_media_set_idx" ON "location_homepages_blocks_page_hero" USING btree ("hero_media_set_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "location_homepages_blocks_questurian_maps_dark" CASCADE;
  DROP TABLE "location_homepages_blocks_page_hero" CASCADE;`)
}
