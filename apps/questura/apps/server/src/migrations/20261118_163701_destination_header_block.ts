import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "location_homepages_blocks_destination_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot_count" numeric DEFAULT 0 NOT NULL,
  	"section_heading" varchar,
  	"destination_description" varchar,
  	"destination_media_set_id" integer,
  	"source_block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "location_homepages_blocks_destination_header" ADD CONSTRAINT "location_homepages_blocks_destination_header_destination_media_set_id_media_sets_id_fk" FOREIGN KEY ("destination_media_set_id") REFERENCES "public"."media_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "location_homepages_blocks_destination_header" ADD CONSTRAINT "location_homepages_blocks_destination_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."location_homepages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "location_homepages_blocks_destination_header_order_idx" ON "location_homepages_blocks_destination_header" USING btree ("_order");
  CREATE INDEX "location_homepages_blocks_destination_header_parent_id_idx" ON "location_homepages_blocks_destination_header" USING btree ("_parent_id");
  CREATE INDEX "location_homepages_blocks_destination_header_path_idx" ON "location_homepages_blocks_destination_header" USING btree ("_path");
  CREATE INDEX "location_homepages_blocks_destination_header_destination_idx" ON "location_homepages_blocks_destination_header" USING btree ("destination_media_set_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "location_homepages_blocks_destination_header" CASCADE;`)
}
