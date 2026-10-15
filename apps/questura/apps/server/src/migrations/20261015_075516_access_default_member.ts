import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ALTER COLUMN "access" SET DEFAULT 'member';
  ALTER TABLE "listicle_itineraries" ALTER COLUMN "access" SET DEFAULT 'member';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ALTER COLUMN "access" SET DEFAULT 'free';
  ALTER TABLE "listicle_itineraries" ALTER COLUMN "access" SET DEFAULT 'free';`)
}
