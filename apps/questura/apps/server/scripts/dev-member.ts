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

import { DEV_MEMBERSHIP_STATES, devToolsRefusal, isDevMembershipStateName, writeDevMembershipState } from '../src/features/dev-tools/membership-states'

const STATES = DEV_MEMBERSHIP_STATES

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
  const refusal = devToolsRefusal({ NODE_ENV: process.env.NODE_ENV, databaseUri: uri })
  if (refusal) {
    console.error(`Refusing: ${refusal}. This script only edits the local database.`)
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

    if (!isDevMembershipStateName(stateName)) usage()
    const state = STATES[stateName]

    const email = first.trim().toLowerCase()
    const user = await pool.query<{ id: string }>('select id from visitor_auth_users where lower(email) = $1', [email])
    if (user.rowCount === 0) {
      console.error(`No local account for ${email}. Sign up on http://localhost:3000 first (pnpm dev:member --list shows who exists).`)
      process.exit(1)
    }

    const updated = await writeDevMembershipState(pool, user.rows[0].id, stateName, Date.now())
    if (!updated) {
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
