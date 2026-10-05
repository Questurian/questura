import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_single_type_listicles_listicle_type" ADD VALUE 'mixed';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "single_type_listicles" ALTER COLUMN "listicle_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_single_type_listicles_listicle_type";
  CREATE TYPE "public"."enum_single_type_listicles_listicle_type" AS ENUM('dining', 'accommodations', 'attractions', 'nightlife');
  ALTER TABLE "single_type_listicles" ALTER COLUMN "listicle_type" SET DATA TYPE "public"."enum_single_type_listicles_listicle_type" USING "listicle_type"::"public"."enum_single_type_listicles_listicle_type";`)
}
