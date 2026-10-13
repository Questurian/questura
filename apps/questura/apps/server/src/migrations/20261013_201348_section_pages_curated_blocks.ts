import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "eat_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"published_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"last_published_at" timestamp(3) with time zone,
  	"last_published_by_id" integer,
  	"published_revision" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "stay_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"published_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"last_published_at" timestamp(3) with time zone,
  	"last_published_by_id" integer,
  	"published_revision" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "itineraries_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"published_page_blocks" jsonb DEFAULT '[]'::jsonb,
  	"last_published_at" timestamp(3) with time zone,
  	"last_published_by_id" integer,
  	"published_revision" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "eat_page" ADD CONSTRAINT "eat_page_last_published_by_id_users_id_fk" FOREIGN KEY ("last_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stay_page" ADD CONSTRAINT "stay_page_last_published_by_id_users_id_fk" FOREIGN KEY ("last_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "itineraries_page" ADD CONSTRAINT "itineraries_page_last_published_by_id_users_id_fk" FOREIGN KEY ("last_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "eat_page_last_published_by_idx" ON "eat_page" USING btree ("last_published_by_id");
  CREATE INDEX "stay_page_last_published_by_idx" ON "stay_page" USING btree ("last_published_by_id");
  CREATE INDEX "itineraries_page_last_published_by_idx" ON "itineraries_page" USING btree ("last_published_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "eat_page" CASCADE;
  DROP TABLE "stay_page" CASCADE;
  DROP TABLE "itineraries_page" CASCADE;`)
}
