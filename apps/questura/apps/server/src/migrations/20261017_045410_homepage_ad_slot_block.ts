import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."ad_size" AS ENUM('banner', 'rectangle');
  CREATE TABLE "location_homepages_blocks_ad_slot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot_count" numeric DEFAULT 0 NOT NULL,
  	"ad_size" "ad_size" DEFAULT 'banner',
  	"source_block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "location_homepages_blocks_ad_slot" ADD CONSTRAINT "location_homepages_blocks_ad_slot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."location_homepages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "location_homepages_blocks_ad_slot_order_idx" ON "location_homepages_blocks_ad_slot" USING btree ("_order");
  CREATE INDEX "location_homepages_blocks_ad_slot_parent_id_idx" ON "location_homepages_blocks_ad_slot" USING btree ("_parent_id");
  CREATE INDEX "location_homepages_blocks_ad_slot_path_idx" ON "location_homepages_blocks_ad_slot" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "location_homepages_blocks_ad_slot" CASCADE;
  DROP TYPE "public"."ad_size";`)
}
