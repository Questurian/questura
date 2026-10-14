import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "newsletter_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"sent_at" timestamp(3) with time zone NOT NULL,
  	"recipients" numeric NOT NULL,
  	"broadcast_id" varchar NOT NULL,
  	"items" jsonb NOT NULL,
  	"sent_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "newsletter_subscribers" ADD COLUMN "suppressed_at" timestamp(3) with time zone;
  ALTER TABLE "newsletter_issues" ADD CONSTRAINT "newsletter_issues_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "newsletter_issues_sent_at_idx" ON "newsletter_issues" USING btree ("sent_at");
  CREATE UNIQUE INDEX "newsletter_issues_broadcast_id_idx" ON "newsletter_issues" USING btree ("broadcast_id");
  CREATE INDEX "newsletter_issues_sent_by_idx" ON "newsletter_issues" USING btree ("sent_by_id");
  CREATE INDEX "newsletter_issues_updated_at_idx" ON "newsletter_issues" USING btree ("updated_at");
  CREATE INDEX "newsletter_issues_created_at_idx" ON "newsletter_issues" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "newsletter_issues" CASCADE;
  ALTER TABLE "newsletter_subscribers" DROP COLUMN "suppressed_at";`)
}
