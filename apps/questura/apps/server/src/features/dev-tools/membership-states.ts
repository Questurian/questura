/**
 * Local-only membership states, shared by `pnpm dev:member` and the
 * localhost DEV switcher (`/api/dev/membership`).
 *
 * Live derives membership from the dates on a visitor's `visitor_profiles`
 * row (`deriveVisitorMembership`, ADR-0008), which the Stripe webhook writes.
 * These write the same columns the webhook would, so `/api/me`, every gate and
 * the client run their real code. Nothing here talks to Stripe.
 */

const DAY = 24 * 60 * 60 * 1000

export type MembershipRow = {
  subscription_status: 'none' | 'active' | 'cancelled' | 'past_due' | null
  paid_through_at: Date | null
  dunning_grace_until: Date | null
  cancel_at_period_end: boolean
  billing_interval: 'month' | 'year' | null
  subscription_paused: boolean
}

type StateDefinition = {
  label: string
  about: string
  /** Whether live would treat this reader as a member (paid access). */
  active: boolean
  row: (now: number) => MembershipRow
}

export const DEV_MEMBERSHIP_STATES = {
  none: {
    label: 'Never paid',
    about: 'never a member',
    active: false,
    row: () => ({ subscription_status: 'none', paid_through_at: null, dunning_grace_until: null, cancel_at_period_end: false, billing_interval: null, subscription_paused: false }),
  },
  member: {
    label: 'Member',
    about: 'active, monthly, renews in 30 days',
    active: true,
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 30 * DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
  yearly: {
    label: 'Member, yearly',
    about: 'active, yearly, renews in 365 days',
    active: true,
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 365 * DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'year', subscription_paused: false }),
  },
  cancelling: {
    label: 'Cancelling',
    about: 'active until the period ends in 30 days, then stops',
    active: true,
    row: (now) => ({ subscription_status: 'active', paid_through_at: new Date(now + 30 * DAY), dunning_grace_until: null, cancel_at_period_end: true, billing_interval: 'month', subscription_paused: false }),
  },
  grace: {
    label: 'Payment failed',
    about: 'renewal charge failed yesterday; still has access for 7 days',
    active: true,
    row: (now) => ({ subscription_status: 'past_due', paid_through_at: new Date(now - DAY), dunning_grace_until: new Date(now + 7 * DAY), cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
  paused: {
    label: 'Paused',
    about: 'paused; no access',
    active: false,
    row: (now) => ({ subscription_status: 'past_due', paid_through_at: new Date(now - DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: true }),
  },
  expired: {
    label: 'Expired',
    about: 'was a member, ended yesterday; no access',
    active: false,
    row: (now) => ({ subscription_status: 'cancelled', paid_through_at: new Date(now - DAY), dunning_grace_until: null, cancel_at_period_end: false, billing_interval: 'month', subscription_paused: false }),
  },
} satisfies Record<string, StateDefinition>

export type DevMembershipStateName = keyof typeof DEV_MEMBERSHIP_STATES

export function isDevMembershipStateName(value: unknown): value is DevMembershipStateName {
  return typeof value === 'string' && Object.hasOwn(DEV_MEMBERSHIP_STATES, value)
}

/**
 * Which named state a stored row is in, or `other` for a row none of them
 * wrote (a real test-mode history, a hand edit).
 */
export function devMembershipStateOf(row: MembershipRow | null, now: number): DevMembershipStateName | 'other' {
  if (!row || row.subscription_status === null || row.subscription_status === 'none') return 'none'
  if (row.subscription_paused) return 'paused'
  const future = (at: Date | null) => at !== null && at.getTime() > now
  if (row.subscription_status === 'past_due' && future(row.dunning_grace_until)) return 'grace'
  if (row.subscription_status === 'active' && future(row.paid_through_at)) {
    if (row.cancel_at_period_end) return 'cancelling'
    return row.billing_interval === 'year' ? 'yearly' : 'member'
  }
  if (row.subscription_status === 'cancelled' && !future(row.paid_through_at)) return 'expired'
  return 'other'
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname)
}

/**
 * Why local dev tools must refuse to run here, or null when they may.
 * Production mode (every Railway deploy) and any database that is not on this
 * machine (Neon) both refuse, each on its own.
 */
export function devToolsRefusal(env: { NODE_ENV?: string; databaseUri?: string }): string | null {
  if (env.NODE_ENV === 'production') return 'running in production mode'
  if (!env.databaseUri) return 'DATABASE_URI is not set'
  let host: string
  try {
    host = new URL(env.databaseUri).hostname
  } catch {
    return 'DATABASE_URI is not a URL'
  }
  if (!isLocalHost(host)) return `DATABASE_URI points at ${host}, not this machine`
  return null
}

type Queryable = {
  query: (text: string, values: unknown[]) => Promise<{ rowCount: number | null; rows: unknown[] }>
}

/** Writes a state onto a visitor's profile row. Returns false when the visitor has no profile yet. */
export async function writeDevMembershipState(
  db: Queryable,
  authUserId: string,
  name: DevMembershipStateName,
  now: number,
): Promise<boolean> {
  const row = DEV_MEMBERSHIP_STATES[name].row(now)
  const updated = await db.query(
    `update visitor_profiles
        set subscription_status = $2, paid_through_at = $3, dunning_grace_until = $4,
            cancel_at_period_end = $5, billing_interval = $6, subscription_paused = $7, updated_at = now()
      where auth_user_id = $1`,
    [authUserId, row.subscription_status, row.paid_through_at, row.dunning_grace_until, row.cancel_at_period_end, row.billing_interval, row.subscription_paused],
  )
  return (updated.rowCount ?? 0) > 0
}

/** Reads a visitor's current state; `none` when they have no profile. */
export async function readDevMembershipState(
  db: Queryable,
  authUserId: string,
  now: number,
): Promise<DevMembershipStateName | 'other'> {
  const { rows } = await db.query(
    `select subscription_status, paid_through_at, dunning_grace_until, cancel_at_period_end, billing_interval, subscription_paused
       from visitor_profiles where auth_user_id = $1`,
    [authUserId],
  )
  return devMembershipStateOf((rows[0] as MembershipRow | undefined) ?? null, now)
}
