# Deploy

**Merge to `main` is the deploy.** `.github/workflows/deploy.yml` runs after
CI passes on a `main` commit:

1. **Plan.** Reads what is live (`releaseSha` on
   `https://api.questurian.com/api/health/ready` and
   `https://www.questurian.com/api/health`) and deploys only the half whose code
   changed since then. A client-only merge does not restart the API; a
   server-only merge does not rebuild the website.
2. **API** (Railway). Deploys `questura-server` at the exact commit and waits
   for `SUCCESS`. Railway's pre-deploy step runs the migrations; its
   healthcheck gates the switch, so a failed deploy leaves the old one
   serving. Then deploys the `questura-reconcile` cron at the same commit, so
   the nightly reconcile runs the same code. Then waits until the live API
   names the commit.
3. **Website** (Cloudflare Worker). Only after the API succeeded or had
   nothing to do. Builds with `opennextjs-cloudflare build` from a clean
   checkout (no `.env` files: every baked-in value is in the workflow),
   scans the upload for localhost addresses, deploys, and waits until
   `www.questurian.com/api/health` names the commit.
4. **Smoke.** Home, a city page, `/join`, both health endpoints.

Watch it: GitHub → Actions → Deploy. A red step names what failed.

Manual run: Actions → Deploy → Run workflow (tick `force` to redeploy both
halves even if nothing changed). It deploys the head of `main`.

## Working day

```
edit on the Mac → pnpm dev → check localhost → branch + PR → CI green → merge → live
```

Batch work by batching merges: each merge that touches code ships.

## One-time setup

Run the wizard. It opens each page, says what to click, checks each key
works, and saves it to the vault (`~/.questura-vault/deploy.env`) and GitHub:

```bash
bash apps/questura/scripts/setup-deploy-keys.sh
```

Re-run it to rotate a key. What it sets up, GitHub → repo Settings:

- **Environment `production`**, deployment branches: `main` only. Its
  secrets are therefore never available to a pull request or a fork.
  - Secret `RAILWAY_TOKEN`: a Railway **project token** for project
    `questura`, environment `production` (Railway → project → Settings →
    Tokens). Not an account token.
  - Secret `CLOUDFLARE_API_TOKEN`: Cloudflare → My Profile → API Tokens →
    template "Edit Cloudflare Workers", plus **D1: Edit** (the tag cache),
    scoped to the one account and the `questurian.com` zone.
  - Secret `CLOUDFLARE_ACCOUNT_ID`.
- **Repository variables** (public values, they end up in the browser
  bundle): `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`), `GOOGLE_MAPS_API_KEY`,
  `ENDORSELY_ENABLED` (`true`), `ENDORSELY_ORG_ID`, `IMAGE_CDN_ORIGIN`
  (`https://questurian-cdn.b-cdn.net`).

Why tokens in GitHub are acceptable in a public repo: anyone who can push to
`main` can already ship code that reads every production variable, which is
what auto-deploy means. The environment rule keeps the tokens away from
everything that is not `main`. The database and the Stripe key still never go
in a GitHub workflow.

## When Railway settings or variables change

The pipeline deploys code; it does not copy settings. After changing
`questura-server`'s variables or settings, run
`apps/questura/infra/railway/create-reconcile-cron.sh --apply` so the cron's
references match.

## Rollback

- **API:** Railway → `questura-server` → Deployments → the previous one →
  Redeploy. Migrations do not roll back: a migration is additive by rule
  (`scripts/deploy/check-pending-migrations.mjs` blocks the rest), so older
  code runs on the newer schema.
- **Website:** `pnpm exec wrangler rollback` from `apps/questura/apps/client`
  (or Cloudflare → Workers → `questura-client` → Deployments).
- Then revert the merge on `main` so the next deploy does not bring it back.

## Manual fallback

If GitHub Actions is down: `docs/capacity/h01-provisioning-checklist.md`
steps 19–20 (Worker from a worktree) and Railway → `questura-server` →
Deploy. Live Stripe is real money either way: a deploy never triggers a
checkout, but checking checkout on live does.
