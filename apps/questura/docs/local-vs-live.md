# Local vs live

> **The Linux laptop is retired (2026-09-26).** Live is Cloudflare (Worker
> `questura-client` on `www.questurian.com` + `questurian.com`), Railway (API
> `questura-server` on `api.questurian.com`, Redis, us-east4) and Neon
> (Postgres 17, aws-us-east-1). The laptop's pause/resume/deploy scripts are
> historical: do not run them. How the move went and what is left:
> `docs/procedures/cutover.md` and `docs/moveday-handoff-2026-09-26.md`.

Default for UI and ordinary feature work is **Mac localhost**. Stripe, OAuth
and cross-subdomain cookies are checked on the live site.

## What each one is for

| Need | Where |
|---|---|
| Layout, CSS, copy, most feature clicks | `localhost:3000` / `localhost:4000` |
| Merge work in groups without a deploy per tweak | Local, then PR when the group is ready |
| Stripe Checkout, webhooks, membership truth | Live site (Railway API) |
| Google OAuth redirects | Live site |
| Staff/visitor cookies across subdomains | Live site |

Local Postgres (`google-login` @5432) holds a **copy of live's content**,
refreshed by `pnpm dev` (below). Never edit it expecting the site to change;
content is edited on the live API (the studio writes there). The live DB is
Neon. Local never answers “what does live Stripe do?”

### Local content comes from live

`pnpm dev` copies live's content to the Mac when the last copy is over 6 hours
old; the start-up banner says how old it is. `pnpm --dir apps/server
db:refresh` copies it now (restart `pnpm dev` afterwards so pages drop what
they cached). `QUESTURA_DB_REFRESH=off pnpm dev` skips it.

- **Copied:** articles, locations, pages and their blocks, photos, listicles,
  authors, currencies: the CONTENT list in
  `apps/server/scripts/db-refresh/tables.ts`. Local rows in those tables are
  replaced, so local content edits do not survive a refresh.
- **Never copied or touched:** staff logins, readers, members, payments, email
  (the PRIVATE list). Local test accounts and `dev:member` states survive.
  Content that links to a live staff user loses that link locally.
- **Cannot touch live:** it reads through `questura_local_refresh`, a login
  that can only `SELECT` the content tables, and it refuses to write to any
  database that is not on this Mac. The load is one transaction; a failure
  leaves the old content in place.
- **One-time setup:** `pnpm --dir apps/server db:refresh:setup` makes that
  login on Neon (using the owner URL in `~/.questura-vault/generated.env`),
  proves from it that staff, reader and member tables are refused, and saves
  its URL to `~/.questura-vault/local-refresh.env`. Run it again after adding
  a content table; `db:refresh` says when.
- It refuses when live has a migration the Mac lacks: pull `main`, run
  `pnpm db:migrate`, try again.
- A new table must go in one of the two lists (`tables.test.ts` fails
  otherwise). If people or payments live in it, it is PRIVATE.

## Local loop

```bash
cd apps/questura
pnpm dev
```

Client: `http://localhost:3000`. Server / Payload admin: `http://localhost:4000`.

Env files already point here (`apps/server/.env`, `apps/client/.env.local`).
Stripe keys on the Mac are empty on purpose — do not paste live keys into them.

The client must talk to the **local** API for sign-in to work. The
`questura-client-live-api` launch config points the client at
`api.questurian.com`, which refuses `localhost` by design (CORS): pages load,
but the navbar always reads signed out.

If the server's start-up banner says **LOCAL DATABASE IS BEHIND THE CODE**,
run `pnpm db:migrate` from `apps/server` (AGENTS.md migration rules). Until
you do, any query naming a newer column fails — sign-up and sign-in were the
first casualties (2026-09-28, three migrations behind).

### Members on localhost

Nobody can pay on the Mac, so nobody is a member unless you say so. Sign in
on `http://localhost:3000` with a local account, then use the **DEV** chip in
the bottom-left corner: pick Never paid, Member, Member yearly, Cancelling,
Payment failed, Paused or Expired and the page reloads as that reader. It also
signs you out.

The chip exists only under `pnpm dev` on localhost (it is not in the live
build), and its route (`/api/dev/membership`) answers 404 in production mode or
against any database that is not on this machine. Nothing reaches Stripe.

The same states from a terminal, for scripts:

```bash
pnpm --dir apps/server dev:member you@example.com member
```

States: `member`, `yearly`, `cancelling`, `grace` (failed renewal, still has
access), `paused`, `expired`, `none`. `pnpm --dir apps/server dev:member --list`
shows local accounts. Both write the same `visitor_profiles` columns the Stripe
webhook writes, so `/api/me`, the paywall and the navbar all agree.

### Redis (optional)

With `REDIS_URL` set, the server keeps visitor sessions and Better Auth's rate
limits in Redis — the same path production takes. Without it, sessions and
limits stay in Postgres and counters fall back to per-process memory. Use it
when the change touches sessions or rate limits:

```bash
docker compose -f infra/local/compose.yml up -d
```

Then set `REDIS_URL=redis://127.0.0.1:6380` in `apps/server/.env` and restart
the server. Port 6380 on purpose: on the retired Linux laptop, 6379 was the
live `questura-redis` container. Keep local off 6379.

Sessions are also written to Postgres (`storeSessionInDatabase`, #650), so
flushing the local Redis no longer signs anyone out: lookups fall back to
`visitor_auth_sessions` until the session next refreshes.

### Auth smoke test

A signed-in check of visitor auth against the local server, in about ten
seconds. Run it after touching sign-in, sessions, Redis, rate limits or the
payment routes' auth:

```bash
scripts/auth-smoke.sh
```

It signs up a throwaway `qa-smoke-…@example.com` user, signs in a second
session, and checks `/api/me`, `/api/account/auth-methods`, the session rows
in Postgres, a flush of the local Redis, a password change (the other
session's payment route answers 401 at once), the change-password limit
(5 a minute, then 429) and sign-out. It also calls the five `/api/payments/*`
routes as an anonymous caller (401), a signed-in non-member (404/400), a
foreign origin (403), a signed-out session and an expired one (401 even though
their `/api/me` still says signed in from the five-minute cookie cache). It
exits non-zero on any failure.

It refuses to run unless the server on port 4000 uses `REDIS_URL` on
`127.0.0.1:6380`, `DATABASE_URI` on `127.0.0.1:5432`, an **empty**
`RESEND_API_KEY` (sign-up mails a verification link otherwise) and an **empty**
`STRIPE_SECRET_KEY` (so nothing it calls reaches Stripe in either mode). It reads these
the way Next does for the running process: its environment first, then the
`.env*` files. So start the server with email and Stripe blanked instead of
editing `.env`:

```bash
env RESEND_API_KEY= STRIPE_SECRET_KEY= pnpm --dir apps/server dev
```

(In the desktop app that is the `questura-server-offline` launch config.)
The script flushes only the `questura-local-redis` container, never port 6379.
With no Stripe key, checkout's plan lookup fails closed (400) after the auth
check. Test users stay in the scratch database.

## Park / resume live (retired)

The laptop's `pause-live.sh`, `resume-live.sh` and `~/questura/deploy.sh` no
longer apply. Do **not** run `resume-live.sh`: it would start a second copy of
the site against an out-of-date database. Live is not parked any more; a merge
to `main` deploys it (`docs/procedures/deploy.md`). Checkout on live is a real
charge.

The laptop's timers are gone too. The nightly Stripe reconcile, exchange-rate
sync, uptime check and daily database copy now run on Railway cron and GitHub
Actions: `docs/procedures/scheduled-jobs.md` lists each one and how to check it.

Run everything open in `live-checks/` (top level of `apps/questura`) against
the live site: that folder collects the checks merged work is still waiting on.

## Git

Local preview is not “skip GitHub.” Still branch / PR / CI. Merging to `main`
ships: CI, then `.github/workflows/deploy.yml` (`docs/procedures/deploy.md`).
Batch small tweaks into one PR rather than merging each.
