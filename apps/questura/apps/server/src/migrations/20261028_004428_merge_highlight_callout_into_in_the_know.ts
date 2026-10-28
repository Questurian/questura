import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Highlight Callout merges into In the Know (owner, 2026-10-27): the two
 * carried the same kind of copy (a short label over a practical aside) and
 * drew as the same box. Both tables have the same columns, so every callout
 * moves across as it is: same id, label, text and `_order`, so it keeps its
 * place in its article. Keep the old table for the release still serving
 * during pre-deploy and for code rollback. Dropping it is a separate, approved
 * cleanup after code that no longer uses it has served for one release.
 * `down` keeps both copies: rolling code back must not delete editorial data.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   INSERT INTO "articles_blocks_in_the_know" ("_order", "_parent_id", "_path", "id", "label", "text", "block_name")
   SELECT "_order", "_parent_id", "_path", "id", "label", "text", "block_name"
   FROM "articles_blocks_highlight_callout";`)
}

export async function down(): Promise<void> {
  // Preserve editorial data in both tables when rolling code back.
}
