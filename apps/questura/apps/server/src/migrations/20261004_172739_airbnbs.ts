import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_airbnbs_status" AS ENUM('draft', 'published');
  CREATE TABLE "airbnbs_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "airbnbs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"listing_url" varchar NOT NULL,
  	"stay_type" varchar,
  	"near" varchar,
  	"description" varchar,
  	"price" varchar,
  	"rating" numeric,
  	"review_count" numeric,
  	"location_ref_id" integer,
  	"created_by_id" integer,
  	"status" "enum_airbnbs_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "airbnbs_id" integer;
  ALTER TABLE "airbnbs_gallery" ADD CONSTRAINT "airbnbs_gallery_image_id_media_sets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "airbnbs_gallery" ADD CONSTRAINT "airbnbs_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."airbnbs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "airbnbs" ADD CONSTRAINT "airbnbs_location_ref_id_locations_id_fk" FOREIGN KEY ("location_ref_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "airbnbs" ADD CONSTRAINT "airbnbs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "airbnbs_gallery_order_idx" ON "airbnbs_gallery" USING btree ("_order");
  CREATE INDEX "airbnbs_gallery_parent_id_idx" ON "airbnbs_gallery" USING btree ("_parent_id");
  CREATE INDEX "airbnbs_gallery_image_idx" ON "airbnbs_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "airbnbs_listing_url_idx" ON "airbnbs" USING btree ("listing_url");
  CREATE INDEX "airbnbs_location_ref_idx" ON "airbnbs" USING btree ("location_ref_id");
  CREATE INDEX "airbnbs_created_by_idx" ON "airbnbs" USING btree ("created_by_id");
  CREATE INDEX "airbnbs_updated_at_idx" ON "airbnbs" USING btree ("updated_at");
  CREATE INDEX "airbnbs_created_at_idx" ON "airbnbs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_airbnbs_fk" FOREIGN KEY ("airbnbs_id") REFERENCES "public"."airbnbs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_airbnbs_id_idx" ON "payload_locked_documents_rels" USING btree ("airbnbs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "airbnbs_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "airbnbs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "airbnbs_gallery" CASCADE;
  DROP TABLE "airbnbs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_airbnbs_fk";
  
  DROP INDEX "payload_locked_documents_rels_airbnbs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "airbnbs_id";
  DROP TYPE "public"."enum_airbnbs_status";`)
}
