import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "articles_blocks_read_more" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "url" varchar,
    "block_name" varchar
  );

  ALTER TABLE "articles_blocks_read_more" ADD CONSTRAINT "articles_blocks_read_more_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_blocks_read_more_order_idx" ON "articles_blocks_read_more" USING btree ("_order");
  CREATE INDEX "articles_blocks_read_more_parent_id_idx" ON "articles_blocks_read_more" USING btree ("_parent_id");
  CREATE INDEX "articles_blocks_read_more_path_idx" ON "articles_blocks_read_more" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "articles_blocks_read_more" CASCADE;`)
}
