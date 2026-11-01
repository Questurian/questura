import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."itm_media_mode" ADD VALUE 'none';`)
}

export async function down(): Promise<void> {
  // Removing an enum value would invalidate existing blurb-only stops.
  throw new Error('This additive enum migration cannot be rolled back safely. Roll back code only.')
}
