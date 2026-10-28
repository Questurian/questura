import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Highlight Callout merges into In the Know (owner, 2026-10-27): the two
 * carried the same kind of copy (a short label over a practical aside) and
 * drew as the same box. Both tables have the same columns, so every callout
 * moves across as it is: same id, label, text and `_order`, so it keeps its
 * place in its article. The old table is dropped only once the copy checks out.
 * `down` restores the empty table, not the rows: they stay In the Know.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   INSERT INTO "articles_blocks_in_the_know" ("_order", "_parent_id", "_path", "id", "label", "text", "block_name")
   SELECT "_order", "_parent_id", "_path", "id", "label", "text", "block_name"
   FROM "articles_blocks_highlight_callout";`)

  const check = await db.execute(sql`
   SELECT count(*)::int AS missing
   FROM "articles_blocks_highlight_callout" h
   WHERE NOT EXISTS (SELECT 1 FROM "articles_blocks_in_the_know" k WHERE k."id" = h."id");`)
  const missing = Number((check.rows[0] as { missing: number } | undefined)?.missing ?? 0)
  if (missing > 0) throw new Error(`${missing} highlight callout(s) did not copy into In the Know; nothing dropped`)

  await db.execute(sql`
   DROP TABLE "articles_blocks_highlight_callout" CASCADE;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "articles_blocks_highlight_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar DEFAULT 'Highlight Callout',
  	"text" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "articles_blocks_highlight_callout" ADD CONSTRAINT "articles_blocks_highlight_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_blocks_highlight_callout_order_idx" ON "articles_blocks_highlight_callout" USING btree ("_order");
  CREATE INDEX "articles_blocks_highlight_callout_parent_id_idx" ON "articles_blocks_highlight_callout" USING btree ("_parent_id");
  CREATE INDEX "articles_blocks_highlight_callout_path_idx" ON "articles_blocks_highlight_callout" USING btree ("_path");`)
}
