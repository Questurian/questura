import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_rels" ADD COLUMN "airbnbs_id" integer;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_airbnbs_fk" FOREIGN KEY ("airbnbs_id") REFERENCES "public"."airbnbs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_rels_airbnbs_id_idx" ON "articles_rels" USING btree ("airbnbs_id");
  ALTER TABLE "articles_blocks_hotel_list" DROP COLUMN "display";
  DROP TYPE "public"."enum_articles_blocks_hotel_list_display";
  -- The list's field was renamed hotels -> stays; its rows keep their hotels.
  UPDATE "articles_rels" SET "path" = regexp_replace("path", '[.]hotels$', '.stays')
    WHERE "path" ~ '^contentBlocks[.][0-9]+[.]hotels$';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_blocks_hotel_list_display" AS ENUM('carousel', 'stack');
  ALTER TABLE "articles_rels" DROP CONSTRAINT "articles_rels_airbnbs_fk";
  
  DROP INDEX "articles_rels_airbnbs_id_idx";
  ALTER TABLE "articles_blocks_hotel_list" ADD COLUMN "display" "enum_articles_blocks_hotel_list_display" DEFAULT 'carousel';
  DELETE FROM "articles_rels" WHERE "airbnbs_id" IS NOT NULL AND "path" ~ '^contentBlocks[.][0-9]+[.]stays$';
  ALTER TABLE "articles_rels" DROP COLUMN "airbnbs_id";
  UPDATE "articles_rels" SET "path" = regexp_replace("path", '[.]stays$', '.hotels')
    WHERE "path" ~ '^contentBlocks[.][0-9]+[.]stays$';`)
}
