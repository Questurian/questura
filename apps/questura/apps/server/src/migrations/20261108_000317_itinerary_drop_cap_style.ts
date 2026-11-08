import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_listicle_itineraries_header_drop_cap_style" AS ENUM('offset-frame', 'inner-line');
  ALTER TABLE "listicle_itineraries" ADD COLUMN "header_drop_cap_style" "enum_listicle_itineraries_header_drop_cap_style" DEFAULT 'offset-frame';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "listicle_itineraries" DROP COLUMN "header_drop_cap_style";
  DROP TYPE "public"."enum_listicle_itineraries_header_drop_cap_style";`)
}
