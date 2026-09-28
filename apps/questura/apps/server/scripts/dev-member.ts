/**
 * Put a LOCAL visitor account into a membership state, so the navbar, the
 * paywall and the account page can be checked on localhost.
 *
 * Why this exists: on the Mac there is no Stripe key, so nobody can pay and
 * nobody is ever a member. Live derives membership from the dates on the
 * visitor's `visitor_profiles` row (`deriveVisitorMembership`, ADR-0008),
 * which the Stripe webhook writes. This script writes the same columns the
 * webhook would, so the server's `/api/me`, every gate and the client all run
 * their real code and agree with each other. The client-only "DEV: member"
 * toggle in the user menu does not: the server still says "not a member", so
 * gated articles stay locked.
 *
 * Local only. It refuses any database that is not on this machine, so it
 * cannot touch Neon even if DATABASE_URI is pointed there by mistake.
 *
 * Usage (from apps/questura/apps/server):
 *   pnpm dev:member --list                      # local accounts and their state
 *   pnpm dev:member you@example.com member      # active monthly member
 *   pnpm dev:member you@example.com <state>
 *
 * The account must exist first: sign up on http://localhost:3000.
 */

import 'dotenv/config'
import { Pool } from 'pg'

const DAY = 24 * 60 * 60 * 1000

type Row = {
  subscription_status: 'none' | 'active' | 'cancelled' | 'past_due' | null
  paid_through_at: Date | null
  dunning_grace_until: Date | null
  cancel_at_period_end: boolean
  billing_interval: 'month' | 'year' | null
  subscription_paused: boolean
}

const STATES: Record<string, { about: string; row: (now: number) => Row }> = {
  member: {
    about: 'active, monthly, renews in 30 days',
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 30 * DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
  yearly: {
    about: 'active, yearly, renews in 365 days',
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 365 * DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'year', subscription_paused: false }),
  },
  cancelling: {
    about: 'active until the period ends in 30 days, then stops',
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 30 * DAY), dunning_grace_until: null, cancel_at_period_end: true, billing_interval: 'month', subscription_paused: false }),
  },
  grace: {
    about: 'renewal charge failed yesterday; still has access for 7 days',
    row: (now) => ({ subscription_status: 'past_due', paid_through_at: new Date(now - DAY), dunning_grace_until: new Date(now + 7 * DAY), cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
  paused: {
    about: 'paused; no access',
    row: (now) => ({ subscription_status: 'past_due', paid_through_at: new Date(now - DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: true }),
  },
  expired: {
    about: 'was a member, ended yesterday; no access',
    row: (now) => ({ subscription_status: 'cancelled', paid_through_at: new Date(now - DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
  none: {
    about: 'never a member',
    row: () => ({ subscription_status: 'none', paid_through_at: null, dunning_grace_until: null, cancel_at_period_end: false, billing_interval: null, subscription_paused: false }),
  },
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function usage(): never {
  console.error('usage: pnpm dev:member --list')
  console.error('       pnpm dev:member <email> <state>')
  console.error('states:')
  for (const [name, { about }] of Object.entries(STATES)) console.error(`  ${name.padEnd(11)} ${about}`)
  process.exit(2)
}

function localConnectionString(): string {
  const uri = process.env.DATABASE_URI
  if (!uri) {
    console.error('DATABASE_URI is not set.')
    process.exit(2)
  }
  const host = new URL(uri).hostname
  if (!LOCAL_HOSTS.has(host) || process.env.NODE_ENV === 'production') {
    console.error(`Refusing: DATABASE_URI points at ${host}, not this machine. This script only edits the local database.`)
    process.exit(2)
  }
  return uri
}

async function main() {
  const [first, stateName] = process.argv.slice(2)
  if (!first) usage()

  const pool = new Pool({ connectionString: localConnectionString(), max: 1, connectionTimeoutMillis: 10000 })

  try {
    if (first === '--list') {
      const { rows } = await pool.query(
        `select u.email, p.subscription_status, p.paid_through_at, p.dunning_grace_until, p.cancel_at_period_end
           from visitor_auth_users u left join visitor_profiles p on p.auth_user_id = u.id
          order by u."createdAt" desc`,
      )
      if (rows.length === 0) console.log('No local accounts yet. Sign up on http://localhost:3000.')
      for (const r of rows) {
        const now = Date.now()
        const active = (r.paid_through_at && r.paid_through_at.getTime() > now) || (r.dunning_grace_until && r.dunning_grace_until.getTime() > now)
        console.log(`${active ? 'MEMBER ' : '       '} ${r.email}  (${r.subscription_status ?? 'no profile'}${r.cancel_at_period_end ? ', cancelling' : ''})`)
      }
      return
    }

    const state = stateName ? STATES[stateName] : undefined
    if (!state) usage()

    const email = first.trim().toLowerCase()
    const user = await pool.query<{ id: string }>('select id from visitor_auth_users where lower(email) = $1', [email])
    if (user.rowCount === 0) {
      console.error(`No local account for ${email}. Sign up on http://localhost:3000 first (pnpm dev:member --list shows who exists).`)
      process.exit(1)
    }

    const row = state.row(Date.now())
    const updated = await pool.query(
      `update visitor_profiles
          set subscription_status = $2, paid_through_at = $3, dunning_grace_until = $4,
              cancel_at_period_end = $5, billing_interval = $6, subscription_paused = $7, updated_at = now()
        where auth_user_id = $1`,
      [user.rows[0].id, row.subscription_status, row.paid_through_at, row.dunning_grace_until, row.cancel_at_period_end, row.billing_interval, row.subscription_paused],
    )
    if (updated.rowCount === 0) {
      console.error(`${email} has no visitor profile yet. Sign in once on http://localhost:3000, then run this again.`)
      process.exit(1)
    }

    console.log(`${email} is now "${stateName}": ${state.about}. Reload the page.`)
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
