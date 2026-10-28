import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "articles_blocks_hotel_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "articles_rels" ADD COLUMN "accommodations_id" integer;
  ALTER TABLE "articles_rels" ADD COLUMN "airbnbs_id" integer;
  ALTER TABLE "articles_blocks_hotel_list" ADD CONSTRAINT "articles_blocks_hotel_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_blocks_hotel_list_order_idx" ON "articles_blocks_hotel_list" USING btree ("_order");
  CREATE INDEX "articles_blocks_hotel_list_parent_id_idx" ON "articles_blocks_hotel_list" USING btree ("_parent_id");
  CREATE INDEX "articles_blocks_hotel_list_path_idx" ON "articles_blocks_hotel_list" USING btree ("_path");
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_accommodations_fk" FOREIGN KEY ("accommodations_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_airbnbs_fk" FOREIGN KEY ("airbnbs_id") REFERENCES "public"."airbnbs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_rels_accommodations_id_idx" ON "articles_rels" USING btree ("accommodations_id");
  CREATE INDEX "articles_rels_airbnbs_id_idx" ON "articles_rels" USING btree ("airbnbs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_blocks_hotel_list" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "articles_blocks_hotel_list" CASCADE;
  ALTER TABLE "articles_rels" DROP CONSTRAINT "articles_rels_accommodations_fk";
  
  ALTER TABLE "articles_rels" DROP CONSTRAINT "articles_rels_airbnbs_fk";
  
  DROP INDEX "articles_rels_accommodations_id_idx";
  DROP INDEX "articles_rels_airbnbs_id_idx";
  ALTER TABLE "articles_rels" DROP COLUMN "accommodations_id";
  ALTER TABLE "articles_rels" DROP COLUMN "airbnbs_id";`)
}
