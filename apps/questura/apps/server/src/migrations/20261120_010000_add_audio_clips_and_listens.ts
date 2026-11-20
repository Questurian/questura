import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * AudioClips and Listens (ADR-0018).
 *
 * Additive only: two new tables, their indexes, and the
 * `payload_locked_documents_rels` columns every Payload collection needs.
 * Nothing existing is altered.
 *
 * Hand-written like the Bookmarks migration, for the same reason: the drizzle
 * snapshot chain is incomplete, so a generated diff proposes unrelated renames.
 *
 * `article_id`, `clip_id` and `auth_user_id` are deliberately not foreign
 * keys. A clip must never stop an editor deleting an article, a Listen must
 * survive its clip being re-recorded, and Better Auth owns its user table
 * (ADR-0004). The account erasure script deletes a reader's Listens.
 *
 * The (article_id, section_key) unique index is what makes "one clip per
 * section" true; the upload route replaces rather than adds.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "audio_clips" (
      "id" serial PRIMARY KEY NOT NULL,
      "article_id" numeric NOT NULL,
      "section_key" varchar NOT NULL,
      "section_title" varchar NOT NULL,
      "sentences" jsonb NOT NULL,
      "duration_seconds" numeric NOT NULL,
      "voice_id" varchar NOT NULL,
      "voice_name" varchar NOT NULL,
      "model" varchar NOT NULL,
      "storage_key" varchar NOT NULL,
      "bytes" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "audio_clips_article_id_idx" ON "audio_clips" USING btree ("article_id");
    CREATE INDEX IF NOT EXISTS "audio_clips_updated_at_idx" ON "audio_clips" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "audio_clips_created_at_idx" ON "audio_clips" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "audio_clips_article_id_section_key_idx"
      ON "audio_clips" USING btree ("article_id", "section_key");

    CREATE TABLE IF NOT EXISTS "audio_listens" (
      "id" serial PRIMARY KEY NOT NULL,
      "listen_id" varchar NOT NULL,
      "auth_user_id" varchar NOT NULL,
      "clip_id" numeric NOT NULL,
      "article_id" numeric NOT NULL,
      "section_key" varchar NOT NULL,
      "is_staff" boolean DEFAULT false,
      "started_at" timestamp(3) with time zone NOT NULL,
      "last_heard_at" timestamp(3) with time zone NOT NULL,
      "seconds_heard" numeric DEFAULT 0 NOT NULL,
      "clip_duration" numeric NOT NULL,
      "ranges" jsonb,
      "speeds" jsonb,
      "finished" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "audio_listens_listen_id_idx" ON "audio_listens" USING btree ("listen_id");
    CREATE INDEX IF NOT EXISTS "audio_listens_auth_user_id_idx" ON "audio_listens" USING btree ("auth_user_id");
    CREATE INDEX IF NOT EXISTS "audio_listens_clip_id_idx" ON "audio_listens" USING btree ("clip_id");
    CREATE INDEX IF NOT EXISTS "audio_listens_article_id_idx" ON "audio_listens" USING btree ("article_id");
    CREATE INDEX IF NOT EXISTS "audio_listens_started_at_idx" ON "audio_listens" USING btree ("started_at");
    CREATE INDEX IF NOT EXISTS "audio_listens_updated_at_idx" ON "audio_listens" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "audio_listens_created_at_idx" ON "audio_listens" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_clips_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_listens_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_audio_clips_fk"
        FOREIGN KEY ("audio_clips_id") REFERENCES "public"."audio_clips"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_audio_listens_fk"
        FOREIGN KEY ("audio_listens_id") REFERENCES "public"."audio_listens"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_clips_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_clips_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_listens_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_listens_id");
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_audio_listens_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_audio_clips_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audio_listens_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audio_clips_id";
    DROP TABLE IF EXISTS "audio_listens";
    DROP TABLE IF EXISTS "audio_clips";
  `))
}
