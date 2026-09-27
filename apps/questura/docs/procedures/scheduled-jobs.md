# Scheduled jobs

What runs on a timer now that the Linux laptop is retired (2026-09-26), where
each one runs, and how to see whether it worked. The laptop had two systemd
timers (`infra/softprod/host/systemd`): a 5-minute healthcheck and the nightly
Stripe reconcile. Exchange rates had no timer there; they synced on each boot.

| Job | When (UTC) | Runs on | Needs |
|---|---|---|---|
| Daily database copy | 03:17 daily | GitHub Actions, `.github/workflows/questura-daily-backup.yml` | see `backup-restore-rollback.md` |
| Stripe reconcile | 04:20 daily | Railway cron service `questura-reconcile` | live DB + Stripe key (referenced from `questura-server`) |
| Exchange-rate sync | 06:41 daily | GitHub Actions, `.github/workflows/questura-exchange-rate-sync.yml` | secret `EXCHANGE_RATE_SYNC_SECRET` |
| Uptime monitor | every 60 s; down after 3 failures | Sentry uptime monitor "API up (api.questurian.com/api/health/ready)" (project `questura-server`) | nothing; alerts through the Sentry email rule |
| Uptime check (backup) | every 15 min on paper (:07, :22, :37, :52); 2–3 h apart in practice | GitHub Actions, `.github/workflows/questura-uptime-check.yml` | nothing (public URLs) |
| Refresh drain | every 60 s | inside `questura-server` itself (ADR-0015) | nothing extra |

The rule for where a job goes: **anything that needs the database or the
Stripe key runs on Railway**, next to the server, with variables *referenced*
from `questura-server`. The repository is public, so GitHub Actions only gets
jobs that call the public API with one narrow secret, or need nothing.

## Turning them on

The two new GitHub workflows are dormant until the repository variable
`QUESTURA_SCHEDULE_ENABLED` is `true`. Values come from the vault inside the
command, never onto the screen:

```bash
grep '^EXCHANGE_RATE_SYNC_SECRET=' ~/.questura-vault/generated.env | cut -d= -f2- | tr -d '\n' \
  | gh secret set EXCHANGE_RATE_SYNC_SECRET --repo Questurian/questurian
gh variable set QUESTURA_SCHEDULE_ENABLED --repo Questurian/questurian --body true
gh workflow run questura-exchange-rate-sync.yml --repo Questurian/questurian
gh workflow run questura-uptime-check.yml --repo Questurian/questurian
```

The secret must equal `EXCHANGE_RATE_SYNC_SECRET` on Railway (the vault's
`generated.env` is where both came from). A 401 in the sync log means they
differ.

The reconcile cron is created by a script that reads `RAILWAY_API_TOKEN` from
`~/.questura-vault/owner.env` and prints names, never values:

```bash
bash apps/questura/infra/railway/create-reconcile-cron.sh --check   # read-only
bash apps/questura/infra/railway/create-reconcile-cron.sh --apply   # create / fix
```

`--apply` is idempotent. It creates `questura-reconcile` with no source,
sets every `questura-server` variable as a `${{questura-server.NAME}}`
reference (plus `APP_ROLE=job`), copies the server's build settings and region,
sets start `pnpm --dir apps/questura/apps/server reconcile:nightly`, cron
`20 4 * * *`, restart policy NEVER, no pre-deploy command (the server's runs
migrations) and no healthcheck, connects the repo, deletes the auto-deploy
trigger that connecting adds, and deploys **the commit the server runs**.

Why every server variable: the reconcile boots Payload, and Payload's `onInit`
refuses a production boot that is missing any of about 25 of them
(`src/shared/config/assert-production-config.ts`; an earlier local attempt
failed on `REDIS_URL` and localhost CORS). References mean no secret is copied
and a rotation on the server reaches the cron too.

## After every server deploy

The cron has no auto-deploy trigger, like the server. After deploying a new
commit to `questura-server`, run `create-reconcile-cron.sh --apply` again: it
sees the commit differs and deploys the server's commit to the cron. Until you
do, the cron keeps running the previous code. That is safe for a while (the
reconcile only talks to Stripe and the payment tables), but do not let it lag
across a migration that changes those tables.

Adding a variable to the server also needs `--apply`: it adds the reference.

## How to check each one

**Uptime monitor (the alarm).** Sentry → Uptime → *API up*. It checks
`https://api.questurian.com/api/health/ready` every minute and opens a
"Downtime detected" issue after three failures in a row, which the "Email on
every new issue" rule sends to the owner; it resolves itself when the API
answers again. Added 2026-09-26 because the GitHub schedule below ran 96 and
166 minutes apart on its first day, not every 15. Drill: point the monitor at
a URL that 404s, wait ~3 minutes for the email, point it back (done
2026-09-26, the email reached the owner's phone).

**Uptime check (backup).** GitHub → Actions → *Questura uptime check*. A failed
scheduled run emails the person who last changed the workflow's schedule, so
keep that the owner. It fails when `/api/health/ready` is not 200 with
`ready:true`, when the refresh worker's last run failed or it has not
succeeded for 20 minutes, or when `https://www.questurian.com/peru/lima` is not
200. Each check is tried three times, 20 s apart, before it counts. GitHub
runs schedules best-effort: on 2026-09-26 the runs were hours apart, so it is
the backup, not the alarm. It still covers what the Sentry monitor does not:
the refresh worker and the website page.

**Exchange-rate sync.** GitHub → Actions → *Questura exchange-rate sync*. The
log is one line, `exchange-rate sync: HTTP 200`. The data check: the newest
`latest_usd_rate_fetched_at` in `currencies` is less than a day old.

**Stripe reconcile.** Railway → project `questura` → `questura-reconcile` →
Cron Runs / Deployments. Each run's log ends with the `RECONCILE result=...`
summary lines from `src/features/payments/lib/reconcile-report.ts`. Exit 0 is
all clear or drift that was fixed; exit 1 means a human is needed, and Railway
shows the run as failed (and emails, if deploy-failure notifications are on in
the Railway workspace settings). `--check` also prints the next run time.

Before the first run, confirm the live Stripe key can read webhook endpoints.
The reconcile's first step (`scripts/verify-stripe-webhook-events.ts`) calls
`webhookEndpoints.list`, and the narrow Railway key was issued with webhooks
blocked (`docs/moveday-handoff-2026-09-26.md`). If it cannot, every night will
end `exit 1` on that step while the other four steps still run. The fix is
adding *Webhook Endpoints: Read* to that restricted key in the Stripe
dashboard, not swapping in a wider key.

To try it once by hand without writing anything: Railway → `questura-reconcile`
→ Variables → add `QUESTURA_RECONCILE_APPLY=0`, trigger a run, read the log,
then remove the variable.

## Connection budget

A scheduled job is a whole extra process with its own pools. Production
already counts one (`APP_JOB_PROCESS_COUNT` defaults to 1 in
`src/shared/database/pool-budget.ts`), and Neon allows 450, so nothing needs
setting. Declaring `APP_JOB_PROCESS_COUNT=1` on `questura-server` makes it
explicit; it restarts the server, so do it with the next deploy, then
`--apply` to copy it to the cron.

## Things that will bite

- GitHub turns off scheduled workflows in a public repository after 60 days
  with no commits. It emails first. Re-enable from the Actions tab.
- The uptime check calls through Cloudflare. If a Cloudflare security setting
  starts challenging GitHub's runners, the check fails with a 403 from the
  edge, not from the app. That is a false alarm to fix in Cloudflare.
- `releaseSha` in `/api/health/ready` is `unknown` until Railway sets
  `QUESTURA_RELEASE_SHA=${{RAILWAY_GIT_COMMIT_SHA}}` on the server.
