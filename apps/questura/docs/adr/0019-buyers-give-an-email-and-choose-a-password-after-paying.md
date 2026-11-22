# Buyers give an email and choose a password after paying

*2026-11-22. Owner's goal: paid memberships over sign-ups.*

## Context

A buyer from Instagram met a password form before Stripe's page: email,
password with four rules, Create account, then Subscribe Now. Stripe had no
Checkout Session in the 14 days before this change.

## Decision

- On `/purchase/*` a new email becomes an account with **no credential row**
  and a session (`/api/visitor-auth/sign-up/checkout`), and checkout starts at
  once. The success page asks for the password after payment. Skipping is
  allowed: the reset link creates one.
- **An email that has an account never gets a session from that endpoint.**
  It signs in, or uses the reset link. `checkout-sign-up.test.ts` attacks
  this, and the origin, bot-check, rate-limit and staff-email guards.
- Checkout, webhooks, confirm and reconcile are untouched: ownership is still
  `metadata.visitorAuthUserId`.
- A free standard article asks for the sale in three paper boxes
  (`MembershipPitch`), the last one in place of the newsletter band. Members
  do not see them.
- Audio stays members-only on free articles (ADR-0018: playback checks the
  membership, never the article's tier).

## Considered options

- *True guest checkout, the account made by the webhook from Stripe's email.*
  Rejected: it attaches money to a person by a typed address, which hands the
  membership and billing portal to whoever registered that address first, and
  it would rewrite the webhook, confirm and reconcile ownership rules. The
  reader sees the same steps either way.
- *Keep the password, drop the second Subscribe click.* Safe, but the
  password is the step that costs the sale.

## Consequences

- Accounts with no sign-in method exist (`authProvider: 'unknown'`): buyers
  who left at Stripe, or skipped the password. The account page offers Set
  password, and the sign-in form points them at the reset link.
- A mistyped email with no password is recoverable only while that browser's
  session lasts (set a password) or by support through the billing email.
