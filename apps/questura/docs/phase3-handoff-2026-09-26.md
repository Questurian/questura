# Phase 3 handoff: live but quiet → announce (2026-09-26)

From the coordinator that ran moving day (2026-09-26) to a fresh session that
runs phase 3. Read this whole file first, then `AGENTS.md`, then the files it
points at. **The site is live on the real hosting and NOT announced.** Nothing
here is urgent; nothing may be announced until 3G.

Private companion (ids, script paths, vault layout; never commit it):
`~/.questura-vault/phase3-notes.md`.

## 0. The owner and how to work

- Talk in **simple words**; lead with the plain result. Short answers.
- The owner decides; you code. Use **subagents** for the heavy parts, one per
  area, in parallel when they don't depend on each other.
- **Everything via CLI/API**, never "go click in the dashboard" unless no key
  can do it. When you do need a click, give **exact click-by-click steps**
  (menu names, which button, which option, what they should see after). The
  owner got lost more than once on vague steps.
- **Claude Code's auto-mode safety check** blocks some actions even with the
  owner's "go" (seen today: DNS/domain changes, real-money Stripe writes such
  as cancelling subscriptions, reading decrypted credentials, big writes to the
  production DB, creating Railway services from a subagent). When blocked:
  do not work around it. Write a small **safe script** into
  `~/.questura-vault/moveday/` (or `phase3/`) that reads the vault inside
  itself, prints no secret, refuses on unexpected state, and has a pass and a
  fail check; hand the owner the one command to run. Subagents get blocked
  more often than the main session because the owner's approval lives in the
  main chat: do live writes in the main session.
- **Do not mention content** (articles, authors, empty city pages) until the
  owner asks. It's tracked in issue #736 and comes after the machinery works.
- **One real purchase only**, at step 3F (with tax on). No purchase before.
- Vault rules unchanged: `~/.questura-vault/owner.env` (owner keys) and
  `generated.env` (made on move day) are read only inside scripts with
  `set -a; source …; set +a`; never cat/echo/print a value; redact output.
- Never test live Stripe from localhost/test mode (AGENTS.md). Stripe
  `STRIPE_OPS_KEY` is Mac-only.

## 1. Where things stand (end of 2026-09-26)

| Piece | Where | State |
|---|---|---|
| Website | Cloudflare Worker `questura-client`, `www.questurian.com` (+ apex) | live; apex and `http://` 301 to `https://www` in middleware (#734) |
| API + admin | Railway `questura-server`, `api.questurian.com`, us-east4 | live, commit `8c71d48` (#732). Behind Cloudflare; direct hits get 403 (origin secret, ADR-0016) |
| Database | Neon Postgres 17, aws-us-east-1, 7-day history | merged Mac content + laptop readers/payments; 50 migrations |
| Redis | Railway, same project, `allkeys-lru`, 512 MB | healthy (`/api/health/ready` shows `redis`) |
| Stripe | live account; webhook `questura api (Railway)` on `2025-08-27.basil`, 10 events | webhook proven by 2 real `customer.subscription.deleted` events. Laptop endpoint disabled. 0 active subscriptions |
| Email | Resend, `hello@questurian.com`, sending-only key | reset emails delivered from the new host |
| Backups | GitHub `questura-daily-backup.yml` → R2 `questura-db-backups` | on; first run stored and test-restored |
| Scheduled jobs | see `docs/procedures/scheduled-jobs.md` | Railway cron `questura-reconcile` 04:20 UTC; GitHub exchange-rate sync (daily) and uptime check (every 15 min) |
| Location Manager | owner's Mac, key re-issued | connected to the live API |
| Writer tool (ABW) | owner's Mac, Vite proxy `/payload` → live API (#725, #731) | set up; **no human sign-in yet** |
| Laptop | retired | timers off, Stripe endpoint disabled; key deletion is cutover step 17 (owner) |
| `launch:verify` | real domains | **49/49** |

**Proven today:** data move and counts, pre-deploy migrations, origin lock,
website build + deploy, webhook delivery on real events, checkout session
creation (card only), password reset email, Location Manager key, scheduled
jobs first runs, backup + restore check, redirects.

**Not proven yet:** a real payment end to end (pay → member → members-only
article opens → refund → access removed); Google sign-in by a human on the
new host; ABW staff sign-in through the proxy; behaviour under load; that
alerts actually reach the owner.

### What went wrong on moving day (so it doesn't repeat)

Rehearsals used a fake Stripe, one hostname and no human admin clicks. The
real accounts differed:
- Live Stripe has **Link unavailable** → every checkout failed (fixed: card
  only, #729). Lesson: compare code params with the live account settings.
- The apex and `http://` served the site but the API trusts only
  `https://www` → sign-in failed there (fixed #734).
- Payload 3.90's **Generate** button saves the key itself; a later **Save**
  let our hook overwrite it (fixed #727; cutover step 13 corrected).
- A 4-agent read-only sweep then found ~25 smaller issues; fixed in #730–#733.

## 2. How to deploy now

- **API:** `bash ~/.questura-vault/moveday/01-railway-first-deploy.sh --check`
  then `--apply` (deploys latest `origin/main`, follows logs; expect
  `Pre-deploy complete` and `SUCCESS`). Railway has **no auto-deploy**.
  **Then always** `bash apps/questura/infra/railway/create-reconcile-cron.sh --apply`
  so the nightly job runs the same commit as the server.
- **Website:** build in a worktree, never the working copy (H01 steps 19–20):
  `git worktree add --detach /tmp/questura-build origin/main`, `pnpm install
  --frozen-lockfile` in `apps/questura`, then the build with the four
  `NEXT_PUBLIC_*` values plus the Maps/Endorsely values from the owner's
  config, `pnpm scan:bundle`, secret-leak grep, then
  `pnpm exec opennextjs-cloudflare deploy` with `CLOUDFLARE_API_TOKEN` =
  the vault's setup token. Worker secrets are already set; don't re-set them
  unless rotating (zsh has no `${!name}`: use `bash -c`).
  Reusable scripts: see the private notes.
- **Check after any deploy:** `launch:verify` against the real domains (command
  in the private notes) → 49/49.
- Railway is Railpack from the **repo root** (`/`) with
  `RAILPACK_INSTALL_CMD=pnpm install --frozen-lockfile --filter @questura/server...`;
  `railway.json` is only a record (config-as-code is deprecated there).

## 3. Phase 3 plan (revised with the owner, 2026-09-26)

Order changed on purpose: machinery and safety first, content next, tax and
the single real purchase last.

### 3A. Quick human checks (owner, ~10 min, no money)
1. `https://www.questurian.com/purchase/monthly` signed in → **Subscribe Now**
   → Stripe's page appears → close it, **don't pay**.
2. Google sign-in on www with a Google account (first on the new host).
3. ABW: `cd ~/Desktop/questurian/apps/ai-blog-writer && pnpm dev`, open
   `http://localhost:3003` **in Chrome**, sign in with a staff login; open one
   article; publish nothing yet. Then watch `refresh_jobs` on a harmless save.
Watch Railway logs while the owner clicks; fix what breaks.

### 3B. Error monitoring (you)
Sentry: org `questurian-5x`, project `questura-server` (US), email on every new
issue. Owner signs in at sentry.io. Two things to check and fix if true:
- Errors that are **logged but not reported** (e.g. "Error creating checkout
  session" on moving day reached Railway logs, never Sentry). Make handled
  5xx paths report.
- Website errors: the plan says they reach Sentry via `/api/client-errors`
  and `global-error.tsx`; prove it (PL4 does), don't assume.
Also: releases already carry the commit (`releaseSha`, #732).

### 3C. Load test (PL3; owner picks the spending cap, decision D8)
Plan: `docs/launch-fix-plan-2026-09-24.html` (D8, PL3),
`docs/capacity/load-identity.md` ("Running a window"), baseline
`docs/capacity/runs/2026-09-25-post-upgrade-baseline.md`. Usage alerts at
50%/80% of the cap; stop at 80%. Needs a load-test key on the API for the
window only. Record results in `docs/capacity/runs/`.

### 3D. Ops drills (PL4, owner present)
Forced API error + forced website error (each one Sentry event with a
request id, alert reaches the owner's phone), downtime alert (the GitHub uptime
workflow emails whoever last edited its schedule: confirm it is the owner),
Redis restart, restore drill (`docs/procedures/backup-restore-rollback.md`),
rollbacks, cold start.

### 3E. Content (owner) — issue #736, share image #735
Only when the owner says so. Don't bring it up.

### 3F. Sales tax + the one real purchase (cutover.md "Sales tax", T1–T5)
T1 owner requests Stripe Managed Payments (after content: a finished site is
a safer review) → T2 wait for approval → T3 product tax code
`txcd_10503005` (news/newsletter articles, not the magazine code) → T4 `STRIPE_MANAGED_PAYMENTS=on` on Railway + deploy →
T5 **the one real $12.99 purchase + full refund**, which also proves the
unproven payment path (member unlock, refund removes access within a minute,
receipt shows tax).

### 3G. Announce.

## 4. First task for the new session: the owner's step-by-step script

The owner wants a guided terminal wizard like `~/questura-homework.sh` (the
move-day key wizard): it walks them from start to finish, opens the right
pages, says exactly what to click, waits for "done", checks what it can, and
keeps progress. Build `~/questura-phase3-wizard.sh` with the `wizard` skill,
covering only the owner's parts of 3A–3F (3A clicks; Sentry sign-in; the D8
spending cap and Railway/Neon/Cloudflare usage alerts; being present for 3D;
T1 request; T3/T4 approval moments; the T5 purchase and refund with exact
clicks). Everything else, the session does itself.

## 5. Open items (not blocking)

- PR #721 (Firefox chunk-load fix) is from an older session, still open.
- Stripe: archive the $0.50 price `price_1U5aq5…` and the 100%-off promo code
  starting `QTES` before promo codes are ever turned on; Google Pay is off in
  the payment method configuration (optional). Readers can change their email
  in the customer portal (nightly email step reconciles it).
- Railway edge rules: **dropped on purpose** (the app's origin lock is the
  lock; Railway's cert can't validate behind the Cloudflare proxy).
- Resend: click tracking on (reset links go through click.questurian.com);
  delete the old "Onboarding" and move-day setup keys (owner).
- Owner keys to delete after the move (handoff 2026-09-26 §2):
  `CLOUDFLARE_SETUP_API_TOKEN`, `RESEND_SETUP_KEY`; the laptop's Stripe key
  (cutover step 17). The setup token is still used for Worker deploys: mint a
  deploy-only token first.
- Google OAuth consent screen should be "In production".
- Log noise: pg `sslmode` warning, Better Auth "no atomic consume" warning.
- Old Neon project "Questurian" (PG 14) can be deleted.
- `readiness` never calls `markDegraded`; `redis` field added instead.
