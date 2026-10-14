# Handoff: newsletter stats on Studio's Newsletter page

Written 2026-10-14 for a fresh session. Build this end to end without stopping
to ask between steps: the owner decided the scope below. Talk to him in plain
words.

## Goal

Make Studio → Newsletter (ABW, `localhost:3003/newsletter`) the place to see how
the newsletter is doing, on the same screen where issues are written and sent.

Add, under the current header stats:

1. **Signups over time.** New *confirmed* subscribers per week, last 12 weeks.
2. **Which form works.** Confirmed subscribers by `source`: `homepage-block`,
   `newsletters-page`, `article-end`, `account`.
3. **Confirm rate.** Of signups older than 7 days (a confirm link lives 7 days),
   the share that confirmed. Low means the confirm email is landing in spam.
4. **After each issue.** Per issue: recipients, unsubscribes and bounces/spam
   in the days after it went out (until the next issue).
5. **Past issues.** Subject, date sent, recipients, article count.

**Decided, do not revisit:**
- **No open or click tracking.** It needs tracking pixels and rewritten links,
  Apple Mail makes opens meaningless, and the privacy page says we do not track
  readers. Do not turn on Resend open/click tracking.
- **ABW, not `apps/dashboard`.** ABW already reads Payload with the staff
  cookie; the dashboard app has no Payload access and only holds site health.
- **The site's list is the truth.** Count from Payload, not from Resend.

## What exists (read these first)

Repos: Questura `~/Desktop/questura` (public; read its `AGENTS.md`) and Studio
`~/Desktop/questurian-studio` (private; read its `AGENTS.md`: PRs need
`--label automerge` and a `Before:` / `After:` paragraph).

- Procedure and how the newsletter works: `apps/questura/docs/procedures/newsletter.md`.
- Server feature: `apps/questura/apps/server/src/features/newsletter/`
  - `collections/NewsletterSubscribers.ts`: fields `email`, `status` (pending /
    subscribed / unsubscribed / bounced / complained), `source`, `signedUpAt`,
    `confirmedAt`, `unsubscribedAt`, hidden token fields, `createdAt`/`updatedAt`.
  - `lib/admin.ts`: staff-admin handlers behind `withAdmin` (Payload staff
    cookie, `allowedRoles: ['admin']`): `overview`, `candidates`, `preview`,
    `sendTest`, `sendIssue`. Routes in `src/app/api/newsletter/admin/*/route.ts`.
  - `lib/service.ts`: `subscribe`, `confirm`, `accountSubscribe`, `unsubscribe`,
    `suppress`. `lib/sync.ts`: Resend copy + `reconcileBeforeSend` (returns
    `recipients`). `lib/webhook.ts`: Resend events.
- Studio page: `apps/ai-blog-writer/apps/frontend/src/features/newsletter/`
  (`NewsletterPage.tsx`, `newsletterApi.ts`, `newsletter.css`, test). It reaches
  Questura through the dev server's `/payload` proxy to the **live** API
  (`ABW_PAYLOAD_PROXY_TARGET=https://api.questurian.com`).

## Gaps in the data (fix these first; both are schema changes)

1. **Issues are not recorded.** `sendIssue` sends a Resend broadcast and logs
   it, but nothing stores the recipient count, subject or articles. Today the
   "last issue" date comes from Resend's broadcast list.
   → Add a Payload collection `newsletter-issues`: `subject`, `sentAt`,
   `recipients`, `broadcastId`, `items` (the `{type,id}` refs, as JSON), `sentBy`
   (staff user id). Write one row in `sendIssue` right after the broadcast is
   created. Admin read-only; create via Local API only, like the subscribers.
   Switch `lastIssue()` in `admin.ts` to read this collection (keep Resend as a
   fallback only for issues sent before the collection existed, which is none
   so far).
2. **Bounce/complaint time is not recorded.** `suppress()` sets the status only.
   → Add `suppressedAt` (date) to `NewsletterSubscribers` and set it in
   `suppress()`.

Schema-change rules (Questura `AGENTS.md`): `pnpm db:migrate:create <name>` from
`apps/questura/apps/server` with output to `/tmp`, scan the migration for
destructive SQL, `pnpm db:migrate`, `pnpm generate:types`. Both changes are
additive. `scripts/db-refresh/tables.ts` must classify the new table (it is
admin/per-database state like `email_logs`: PRIVATE_TABLES); its test fails
otherwise.

Known limitation to live with, and to say on the page: a re-signup overwrites
`signedUpAt` and `source`, so "which form" means *the form of the latest
signup*.

## Server endpoint

`GET /api/newsletter/admin/stats` (new route + handler in `admin.ts`, behind
`withAdmin`). One response so the page makes one request:

```ts
{
  weeklyConfirmed: { weekStart: string; count: number }[]   // 12 weeks, UTC Monday, zero-filled
  bySource: Record<'homepage-block' | 'newsletters-page' | 'article-end' | 'account', number> // status=subscribed
  confirmRate: { signedUp: number; confirmed: number; since: string } // signedUpAt older than 7 days, last 90 days
  issues: {
    subject: string; sentAt: string; recipients: number; articleCount: number
    unsubscribedAfter: number   // unsubscribedAt in [sentAt, next issue's sentAt or now)
    suppressedAfter: number     // suppressedAt in the same window
  }[]                           // newest first, last 12
}
```

Counting: the list is small (0 today), so `payload.find({ pagination: false,
select: {...} })` and counting in TypeScript is fine and easy to test. Put the
pure counting in its own module (e.g. `lib/stats.ts`) with unit tests that feed
rows and assert the numbers (week boundaries in UTC, zero-filled weeks, the
7-day confirm window, the per-issue windows).

## Studio UI

Add a "How it's doing" section to `NewsletterPage.tsx` (its own component file),
fetched with React Query like the rest of the page.

- Weekly signups: ABW has **no chart library** (`recharts` is only in
  `apps/dashboard`). Draw 12 bars as inline SVG or CSS; do not add a dependency
  for one bar chart.
- By source: a small table or horizontal bars, with the plain names
  (Homepage block, Newsletters page, End of articles, Account page).
- Confirm rate: one number, e.g. "86% confirm (43 of 50 in the last 90 days)".
  Below 60%, a one-line hint that the confirm email may be landing in spam.
- Issues: a table: date, subject, sent to, unsubscribed after, bounced/spam
  after. Highlight a row where spam reports are above 0.1% of recipients
  (Gmail's own warning threshold is 0.1%; 0.3% is where delivery suffers).
- Empty states: with 0 subscribers and 0 issues (today), show a short "No
  signups yet" / "No issues sent yet" instead of empty charts.

Extend `NewsletterPage.test.tsx` (mock the new API call) for: empty state, bars
rendered for a fixture, the spam highlight.

## Verify

- Server: `pnpm test:int` (vitest), `pnpm typecheck` from `apps/questura/apps/server`
  (errors only under `tmp/` are unrelated scratch files).
- Client of Questura is untouched.
- Studio: from `apps/ai-blog-writer`,
  `npx vitest run --config apps/frontend/vite.config.ts apps/frontend/src/features/newsletter`,
  `npx tsc --noEmit -p apps/frontend`, eslint on the changed files.
- After the Questura PR deploys (merge to main = deploy; the deploy runs only
  when CI on main passes, and the separate "Questura safety net" run checks
  browsers and JS budgets afterwards), open `localhost:3003/newsletter` in the
  built-in browser and check the section renders against live. The list is
  empty, so expect the empty states.

## Shipping

- Questura PR first (schema + endpoint), then Studio PR (UI). Studio will show
  an error for the stats section until the endpoint is live; that is fine for
  the minutes in between.
- Set the Questura PR to auto-merge and Auto-fix (the `ccd_pr` tools). Do not
  poll CI. After merge, check the Deploy run on main succeeded and the
  migration applied (`GET https://api.questurian.com/api/newsletter/admin/stats`
  without a cookie should answer 401, not 404).
