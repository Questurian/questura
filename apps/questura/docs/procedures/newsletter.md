# Procedure: the Questurian newsletter

Monthly, free, one list. Payload owns the list (`newsletter-subscribers`);
Resend holds a copy only to send it. Code: `apps/server/src/features/newsletter/`.

## How a reader gets on and off the list

- **Sign up** (no account needed): the homepage block, `/newsletters`, the end
  of every article, or the account page switch. The row is `pending` and a
  confirmation email goes out (at most 40 a day, so password resets on the
  free Resend plan always have room: `lib/rate-limit.ts`).
- **Confirm**: the email opens `/newsletters/confirm?token=…`; the reader clicks
  the button (a mail scanner opening the link changes nothing). The row becomes
  `subscribed` and is copied to the Resend segment.
- A signed-in reader with a **verified** account email is subscribed at once by
  the account switch; an unverified one gets the confirmation email.
- **Leave**: the one-click link in every issue (Resend → webhook → Payload), or
  the account switch (Payload → Resend).
- **Hard bounce / spam complaint**: the webhook marks the row `bounced` /
  `complained`. Those addresses are never emailed again, from any form.

## One-time setup

```bash
bash apps/questura/infra/newsletter/setup-newsletter.sh
```

It creates the Resend segment, a separate full-access key and the webhook,
asks for the postal address, saves everything to the vault, sets the four
variables on `questura-server` and checks the live webhook answers. Re-run it
any time (it reuses what exists): for example once you have the PO box.

No issue can go to the list without `NEWSLETTER_POSTAL_ADDRESS` (CAN-SPAM).

## Sending an issue (monthly)

Studio → **Newsletter**:

1. The articles published since the last issue are listed and all ticked.
   Untick what should not go out, or pick an earlier date.
2. Write the subject and a short note.
3. **Preview**, then **Send a test to me** (it goes to your staff email).
4. **Send to N subscribers…** → **Yes, send it**. The server first makes the
   Resend segment match Payload exactly, then sends. A second send is refused
   for ten minutes, so a double click cannot mail the list twice.

Each sent issue is recorded in Payload `newsletter-issues` (subject, time,
recipient count, articles, who sent it).

## How it's doing

Studio → Newsletter → **How it's doing** reads
`GET /api/newsletter/admin/stats`: confirmations per week, current subscribers
by signup form, the confirm rate, and the unsubscribes and bounces/spam reports
after each issue. Everything is counted from Payload, not Resend. There is no
open or click tracking, on purpose: the privacy page says readers are not
tracked, so do not turn it on in Resend.

- **Which form** is the form of a reader's *latest* signup: a re-signup
  overwrites `source` and `signedUpAt`.
- **Confirm rate** looks at signups 7–90 days old (a confirm link lives 7
  days) and leaves out verified account holders, who are confirmed without a
  mail. A low rate means the confirm mail is landing in spam.
- **After each issue** counts readers who had confirmed and then unsubscribed
  (`unsubscribedAt`) or bounced / reported spam (`suppressedAt`) between that
  issue and the next.

## Erasure requests

An account holder: `scripts/erase-visitor-account.ts` deletes the row and the
Resend contact (`account-deletion.md`). A subscriber without an account: Payload
admin → Newsletter subscribers → delete the row, and Resend → Audience → delete
the contact.

## When something looks wrong

- Studio's yellow box names any missing server variable.
- `POST https://api.questurian.com/api/newsletter/webhook` with no signature
  answers 400 when the webhook is configured, 503 when the secret is missing.
- Resend → Webhooks shows every delivery and its response code; a 500 is
  retried by Resend.
