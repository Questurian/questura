import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Reader journeys (ADR-0019): one row per browser, one per page view.
 *
 * Additive only: two new tables and their indexes. Plain tables, not Payload
 * collections, so they get no REST endpoints and no admin screens; the only
 * writer is `POST /api/public/journeys`.
 *
 * `auth_user_id` is deliberately not a foreign key: Better Auth owns its user
 * table (ADR-0004). The account erasure script deletes by it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "journey_viewers" (
      "id" uuid PRIMARY KEY NOT NULL,
      "first_seen_at" timestamptz DEFAULT now() NOT NULL,
      "last_seen_at" timestamptz DEFAULT now() NOT NULL,
      "auth_user_id" text,
      "region" text,
      "city" text,
      "os" text,
      "browser" text,
      "device" text,
      "language" text,
      "source" text,
      "campaign" text
    );
    CREATE INDEX IF NOT EXISTS "journey_viewers_last_seen_idx" ON "journey_viewers" ("last_seen_at");
    CREATE INDEX IF NOT EXISTS "journey_viewers_auth_user_idx" ON "journey_viewers" ("auth_user_id");

    CREATE TABLE IF NOT EXISTS "journey_views" (
      "id" uuid PRIMARY KEY NOT NULL,
      "viewer_id" uuid NOT NULL REFERENCES "journey_viewers" ("id") ON DELETE CASCADE,
      "visit_id" uuid NOT NULL,
      "path" text NOT NULL,
      "source" text,
      "campaign" text,
      "started_at" timestamptz DEFAULT now() NOT NULL,
      "last_seen_at" timestamptz DEFAULT now() NOT NULL,
      "seq" integer NOT NULL,
      "visible_seconds" integer NOT NULL,
      "scroll_percent" smallint NOT NULL,
      "events" jsonb NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "journey_views_viewer_idx" ON "journey_views" ("viewer_id", "started_at");
    CREATE INDEX IF NOT EXISTS "journey_views_started_idx" ON "journey_views" ("started_at");
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    DROP TABLE IF EXISTS "journey_views";
    DROP TABLE IF EXISTS "journey_viewers";
  `))
}
