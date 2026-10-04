import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "articles_blocks_airbnb_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"airbnb_id" integer,
  	"block_name" varchar
  );
  
  ALTER TABLE "articles_blocks_airbnb_card" ADD CONSTRAINT "articles_blocks_airbnb_card_airbnb_id_airbnbs_id_fk" FOREIGN KEY ("airbnb_id") REFERENCES "public"."airbnbs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_blocks_airbnb_card" ADD CONSTRAINT "articles_blocks_airbnb_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_blocks_airbnb_card_order_idx" ON "articles_blocks_airbnb_card" USING btree ("_order");
  CREATE INDEX "articles_blocks_airbnb_card_parent_id_idx" ON "articles_blocks_airbnb_card" USING btree ("_parent_id");
  CREATE INDEX "articles_blocks_airbnb_card_path_idx" ON "articles_blocks_airbnb_card" USING btree ("_path");
  CREATE INDEX "articles_blocks_airbnb_card_airbnb_idx" ON "articles_blocks_airbnb_card" USING btree ("airbnb_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "articles_blocks_airbnb_card" CASCADE;`)
}
