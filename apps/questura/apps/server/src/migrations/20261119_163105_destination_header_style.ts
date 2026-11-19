import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_destination_header_style_text_font" AS ENUM('jost', 'lato', 'raleway', 'manrope', 'dmsans', 'worksans', 'serif');
  CREATE TYPE "public"."enum_destination_header_style_text_weight" AS ENUM('300', '400');
  CREATE TYPE "public"."enum_destination_header_style_text_size" AS ENUM('13', '14', '15', '16');
  CREATE TYPE "public"."enum_destination_header_style_text_tone" AS ENUM('grey', 'ink');
  CREATE TYPE "public"."enum_destination_header_style_text_align" AS ENUM('top', 'centre');
  CREATE TABLE "destination_header_style" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"text_font" "enum_destination_header_style_text_font" DEFAULT 'jost' NOT NULL,
  	"text_weight" "enum_destination_header_style_text_weight" DEFAULT '300' NOT NULL,
  	"text_size" "enum_destination_header_style_text_size" DEFAULT '15' NOT NULL,
  	"text_tone" "enum_destination_header_style_text_tone" DEFAULT 'grey' NOT NULL,
  	"text_align" "enum_destination_header_style_text_align" DEFAULT 'top' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "destination_header_style" CASCADE;
  DROP TYPE "public"."enum_destination_header_style_text_font";
  DROP TYPE "public"."enum_destination_header_style_text_weight";
  DROP TYPE "public"."enum_destination_header_style_text_size";
  DROP TYPE "public"."enum_destination_header_style_text_tone";
  DROP TYPE "public"."enum_destination_header_style_text_align";`)
}
