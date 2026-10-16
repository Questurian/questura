# Advisory-lock pool: raise it from 10 to 30

Decided 2026-10-16, with the checkout confirm endpoint
(`POST /api/payments/confirm-checkout`). **Owner action needed**: one Railway
variable, below. Nothing changes until it is set.

## What the pool holds

`shared/utils/advisory-lock.ts` keeps its own small pool (default 10 per
process, `DATABASE_POOL_ADVISORY_LOCK_MAX`). One connection is held for the
whole of every locked operation, including every Stripe call and email send
inside it:

- every Stripe webhook delivery, handled or not, from the duplicate check to
  the event record;
- every resync outside a webhook: cancel, reactivate, and now checkout confirm
  (only when the webhook has not already written the membership);
- the nightly reconcile, in its own process with its own pool.

One purchase raises four handled events (`checkout.session.completed`,
`customer.subscription.created`, `customer.subscription.updated`,
`invoice.payment_succeeded`). They arrive together and queue on one customer
lock, so all four hold a connection while they run one after another.

## The numbers

Per-step times are estimates, not measurements: live has had too few purchases
to read from logs (Railway's HTTP log for the current deployment has no webhook
delivery in it). A Stripe API call from Railway us-east4 is taken as 200–400 ms.

| Step under the customer lock | Stripe calls | Estimate |
|---|---|---|
| `checkout.session.completed` (list, collapse check, resync, extras) | 3 | ~1.0 s |
| first resync that sees the transition (+ product name + Resend email) | 2 + email | ~1.0 s |
| each later resync (no transition) | 2 | ~0.6 s |

So one purchase holds four connections for roughly 1.0, 1.6, 2.2 and 2.8 s:
about **7–8 connection-seconds**, and **4–5 connections at the same moment**
(5 when the success page's confirm also has work to do).

| | pool 10 | pool 30 |
|---|---|---|
| Purchases in the same second with no queueing | 2 | 6–7 |
| Sustained purchases before the queue grows (pool ÷ 7.5 s) | ~1.3/s (~80/min) | ~4/s (~240/min) |
| Backlog that drains inside the 10 s connection wait | ~13 purchases | ~40 purchases |

Past the last row, waiters hit `PG_CONNECTION_TIMEOUT_MS` (10 s), the webhook
answers 500, and Stripe retries minutes later. The success page's confirm
usually lets the buyer in before that retry, but it queues for the same pool:
in a burst past the last row it can time out too, and the page falls back to
"may take a moment" until Stripe's retry lands. The pool size is what keeps
that rare.

Why not more: with deliveries queueing four to a customer, 30 connections means
about 7–8 customers resyncing at once, roughly 20–30 Stripe calls per second,
well inside Stripe's live limit of about 100 per second, which checkout
creation shares. Each extra holder also borrows Payload's 20-connection pool for its
short reads and writes, the same pool serving pages. 50 would double the
Stripe pressure for a burst size this site has not seen.

## It fits the connection budget

Live, as declared on Railway (`questura-server`, read 2026-10-16): direct Neon
endpoint, `DATABASE_MAX_CONNECTIONS=450`, `APP_PROCESS_COUNT=1`,
`APP_ROLLOUT_SURGE=1`, the nightly reconcile as the one job process.

```
before: (1 serving + 1 surge + 1 job) × (20 + 10 + 10 + 1) + 5 reserve = 128 of 450
after:  (1 serving + 1 surge + 1 job) × (20 + 10 + 30 + 1) + 5 reserve = 188 of 450
```

The deploy that applies it still has the old process (41 connections) alive
beside the new one; that state is smaller than the line above. Pinned in
`src/shared/database/pool-budget.test.ts` ("fits live's Railway fleet with the
advisory-lock pool at 30"). The pool closes idle connections after 30 s, so the
extra 20 backends exist on Neon only during a burst.

## Owner steps

1. Railway → project → `questura-server` → **Variables** → **New variable**:
   `DATABASE_POOL_ADVISORY_LOCK_MAX` = `30`, then apply the staged change
   (Railway's **Deploy** button) so the service redeploys with it.
   Had the budget not fit, the boot check would refuse to start it and name
   the numbers in the deploy log, rather than overrun Neon.
2. Give the reconcile cron the same variable reference:

   ```bash
   bash apps/questura/infra/railway/create-reconcile-cron.sh --apply
   ```

3. Check: `curl -s -H "Authorization: Bearer $DB_STATS_SECRET" https://api.questurian.com/api/internal/db-stats | jq '.advisoryLockPool, .budget.description'`
   shows `"max": 30` and the 188-of-450 line. During a busy spell, `waiting`
   above 0 means deliveries are queueing for a lock connection
   (`docs/measuring-the-backend.md`).

To undo: delete the variable (the default is 10) and run step 2 again.
