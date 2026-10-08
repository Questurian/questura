import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "media_assets_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"position" varchar NOT NULL,
  	"title" varchar,
  	"credit" varchar NOT NULL,
  	"url" varchar,
  	"media_set_id" integer,
  	"media_asset_id" integer
  );
  
  CREATE TABLE "media_sets_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"position" varchar NOT NULL,
  	"title" varchar,
  	"credit" varchar NOT NULL,
  	"url" varchar,
  	"media_set_id" integer,
  	"media_asset_id" integer
  );
  
  ALTER TABLE "media_assets" ADD COLUMN "edit_credit" varchar;
  ALTER TABLE "media_sets" ADD COLUMN "edit_credit" varchar;
  ALTER TABLE "media_assets_sources" ADD CONSTRAINT "media_assets_sources_media_set_id_media_sets_id_fk" FOREIGN KEY ("media_set_id") REFERENCES "public"."media_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_assets_sources" ADD CONSTRAINT "media_assets_sources_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_assets_sources" ADD CONSTRAINT "media_assets_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_sets_sources" ADD CONSTRAINT "media_sets_sources_media_set_id_media_sets_id_fk" FOREIGN KEY ("media_set_id") REFERENCES "public"."media_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_sets_sources" ADD CONSTRAINT "media_sets_sources_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_sets_sources" ADD CONSTRAINT "media_sets_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media_sets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_assets_sources_order_idx" ON "media_assets_sources" USING btree ("_order");
  CREATE INDEX "media_assets_sources_parent_id_idx" ON "media_assets_sources" USING btree ("_parent_id");
  CREATE INDEX "media_assets_sources_media_set_idx" ON "media_assets_sources" USING btree ("media_set_id");
  CREATE INDEX "media_assets_sources_media_asset_idx" ON "media_assets_sources" USING btree ("media_asset_id");
  CREATE INDEX "media_sets_sources_order_idx" ON "media_sets_sources" USING btree ("_order");
  CREATE INDEX "media_sets_sources_parent_id_idx" ON "media_sets_sources" USING btree ("_parent_id");
  CREATE INDEX "media_sets_sources_media_set_idx" ON "media_sets_sources" USING btree ("media_set_id");
  CREATE INDEX "media_sets_sources_media_asset_idx" ON "media_sets_sources" USING btree ("media_asset_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "media_assets_sources" CASCADE;
  DROP TABLE "media_sets_sources" CASCADE;
  ALTER TABLE "media_assets" DROP COLUMN "edit_credit";
  ALTER TABLE "media_sets" DROP COLUMN "edit_credit";`)
}
