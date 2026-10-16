# Procedure: the bot check on sign-up, sign-in and password reset

Cloudflare Turnstile stops scripts from using the email forms. Without it the
only brake is Better Auth's per-address limit (5 sign-ups a minute per IP), and
every email sign-up and every password reset sends an email through Resend's
free plan (100 a day, shared with membership mail). A script signing up
strangers' addresses would use that up, and the bounces and complaints can get
the Resend account paused.

**State today: off.** No site key in the website build, and
`TURNSTILE_AUTH_ENABLED` is not `true` on Railway. Nothing changes for readers
until both halves below are done, in that order.

## What it covers

| Form | Request | Checked |
| --- | --- | --- |
| Create account (password step) | `POST /api/visitor-auth/sign-up/email` | yes |
| Sign in with email (password step) | `POST /api/visitor-auth/sign-in/email` | yes |
| Forgot password → Send reset link | `POST /api/visitor-auth/request-password-reset` | yes |
| Continue with Google | `/sign-in/social` | no: Google does its own checks |
| The email step's "does this account exist" | `POST /api/user/check` | no |
| Newsletter sign-up | `/api/newsletter/*` | no (has its own 40/day cap) |

Most readers never see anything: Cloudflare checks the browser in the
background while the reader types their password. Only when it is unsure does a
"Verify you are human" box appear above the button. If Cloudflare's script
cannot load (a strict blocker, no network), the form says "Please complete the
security check and try again." after 15 seconds and sends nothing; Google
sign-in still works.

Code: client `apps/client/src/features/Auth/lib/turnstile.ts` (site key and
token), `components/form/TurnstileWidget.tsx` (the box),
`apps/client/src/lib/api/captcha.ts` (the `x-captcha-response` header).
Server: the Better Auth `captcha` plugin in
`apps/server/src/features/visitor-auth/lib/better-auth.ts`.

## Why the order matters

The server, once switched on, refuses every email sign-up, sign-in and reset
that arrives without a token (400 `Missing CAPTCHA response`). The website
sends a token only once it is built with the site key. So:

1. **Website first.** It starts sending tokens; the server still ignores them.
2. **Server second.** It starts checking them.

Server first would lock everyone out of email sign-in until the website caught
up.

## Switch it on

### 1. Create the widget (Cloudflare)

1. Cloudflare dashboard → **Turnstile** → **Add widget**.
2. **Widget name:** `Questurian sign-in`.
3. **Hostname management:** add `questurian.com` (it covers
   `www.questurian.com` too). Nothing else.
4. **Widget mode:** **Managed**.
5. **Pre-clearance:** leave it off.
6. **Create**. Copy the **site key** and the **secret key**. Put the secret key
   in the vault (`~/.questura-vault/owner.env`) as `TURNSTILE_SECRET_KEY=…` so
   it is not lost. The site key is public; the secret key is not.

### 2. Website: give the build the site key

1. GitHub → `Questurian/questura` → **Settings** → **Secrets and variables** →
   **Actions** → **Variables** tab → **New repository variable**.
   Name `TURNSTILE_SITE_KEY`, value: the site key.
2. Setting a variable does not rebuild anything. **Actions** → **Deploy** →
   **Run workflow**, tick **force**, run. (This redeploys the API too; that is
   harmless.)
3. Wait for the run to go green.

Check: open `https://www.questurian.com`, **Sign in**, type an email,
**Continue**. Wait a few seconds on the password screen, then close it. In
Cloudflare → Turnstile → the widget, the analytics should show challenges
starting to come in (they can take a few minutes to appear). Signing in still
works as before: the server is not checking yet.

### 3. Server: start checking

1. Railway → project `questura` → service `questura-server` → **Variables**.
   Add both at once (the server refuses to start with the flag on and no
   secret):
   - `TURNSTILE_SECRET_KEY` = the secret key
   - `TURNSTILE_AUTH_ENABLED` = `true`
2. Railway redeploys the service. Wait until it is live.
3. The nightly reconcile copies the server's variables by reference, so bring
   it in line (rule in `AGENTS.md`):

   ```bash
   bash apps/questura/infra/railway/create-reconcile-cron.sh --apply
   ```

Check, from any computer:

```bash
curl -s -X POST https://api.questurian.com/api/visitor-auth/sign-up/email -H 'Origin: https://www.questurian.com' -H 'Content-Type: application/json' -d '{}'
```

Before step 3 it answers `"code":"VALIDATION_ERROR"` (the empty form is
refused; that is what live answered on 2026-10-16). After it:
`{"message":"Missing CAPTCHA response","code":"MISSING_RESPONSE"}`. No account
is created and no email is sent either way. Then sign in on
`www.questurian.com` with email and password: it must still work.

## Switch it off

Reverse order. Railway first: set `TURNSTILE_AUTH_ENABLED` to `false` (sign-in
works without tokens again as soon as the service redeploys), then run the
cron script as above. Removing the GitHub variable and force-deploying stops
the website loading Cloudflare's script; it is optional, since tokens the
server ignores do no harm.

## Locally

`pnpm dev` has no site key, so the forms behave exactly as they always did, and
the server never checks outside production. To look at the box, run the API
and the website in two terminals, the website with one of Cloudflare's public
test site keys:

- `1x00000000000000000000AA`: always passes, never shows a box.
- `3x00000000000000000000FF`: always shows the "Verify you are human" box.

```bash
pnpm --dir apps/questura/apps/server dev
```

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=3x00000000000000000000FF pnpm --dir apps/questura/apps/client dev
```

Test keys draw a red "For testing only" note under the box; real keys do not.
The box itself is Cloudflare's (light theme); its inside cannot be restyled.
