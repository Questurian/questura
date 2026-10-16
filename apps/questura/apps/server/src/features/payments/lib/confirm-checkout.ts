import type Stripe from 'stripe'
import { deriveVisitorMembership } from '@/features/visitor-auth/lib/membership-entitlement'
import { findVisitorProfileByAuthUserId } from '@/features/visitor-auth/lib/visitor-profile'
import { logger } from '@/shared/utils/logger'
import { stripe } from './stripe'
import { resyncSubscription } from './subscription-resync'

/**
 * Let the buyer's own browser pull their membership in, instead of waiting for
 * Stripe to push it.
 *
 * Membership used to arrive only by webhook. One purchase raises three or four
 * events, every delivery holds an advisory-lock connection for its whole
 * handler, and they queue behind one another on the customer lock — so a burst
 * of purchases in the same few seconds can exhaust the lock pool, the waiters
 * 500, and Stripe retries them minutes later. The buyer meanwhile sits on the
 * success page reading "may take a moment", having paid.
 *
 * This is the same write the webhook makes, reached from the other side. It
 * runs `resyncSubscription` — refetch the subscription, derive, write, mail any
 * transition — under the same customer lock, so it is idempotent with every
 * delivery: whichever arrives first writes, and the rest observe no transition
 * and send nothing (ADR-0008). In effect it is an early
 * `customer.subscription.created`, which is also why it adds no state the
 * webhook could not already produce.
 *
 * What it deliberately does not do is the duplicate collapse in
 * `handleCheckoutSessionCompleted`. That refunds and cancels subscriptions, and
 * a money-moving step belongs to the signed Stripe event, not to an endpoint a
 * visitor can call. Skipping it here is safe: resync's ownership rule already
 * lets the billing subscription own the profile row, and the webhook still runs
 * the collapse when it arrives.
 */

/**
 * The only session ids worth a Stripe call. Anything else is answered as "not
 * found" without spending the shared Stripe rate budget on it.
 */
const CHECKOUT_SESSION_ID = /^cs_(live|test)_[A-Za-z0-9]{10,250}$/

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && CHECKOUT_SESSION_ID.test(value)
}

export type CheckoutConfirmation =
  /** Not a session, not this visitor's, or not a subscription checkout. One answer for all three. */
  | { outcome: 'not_found' }
  /** Still open or expired: there is no subscription to sync yet. */
  | { outcome: 'not_complete' }
  /** The profile already names this subscription and grants access; nothing was written. */
  | { outcome: 'already_current'; membershipActive: true }
  /** Resynced from Stripe. `membershipActive` is what the profile says afterwards. */
  | { outcome: 'resynced'; membershipActive: boolean }

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    if ((error as { code?: string }).code === 'resource_missing') return null
    throw error
  }
}

/**
 * Bring the signed-in visitor's profile up to date with the Checkout Session
 * they just paid on.
 *
 * Ownership is the session's `metadata.visitorAuthUserId`, written by
 * `create-checkout-session` from the server-side session, never an email
 * address. Someone else's session id is answered exactly as a missing one, so
 * the endpoint cannot be used to learn which ids exist.
 */
export async function confirmCheckoutForVisitor(
  visitorAuthUserId: string,
  sessionId: string
): Promise<CheckoutConfirmation> {
  if (!isCheckoutSessionId(sessionId)) return { outcome: 'not_found' }

  const session = await retrieveSession(sessionId)
  if (!session) return { outcome: 'not_found' }

  if (session.metadata?.visitorAuthUserId !== visitorAuthUserId) {
    logger.warn('Checkout confirm refused: session belongs to another visitor', { sessionId })
    return { outcome: 'not_found' }
  }

  if (session.mode !== 'subscription') return { outcome: 'not_found' }

  const customerId = idOf(session.customer)
  const subscriptionId = idOf(session.subscription)

  if (session.status !== 'complete' || !customerId || !subscriptionId) {
    return { outcome: 'not_complete' }
  }

  const profile = await findVisitorProfileByAuthUserId(visitorAuthUserId)

  // The same refusal `resolveProfileForStripeCustomer` makes: a visitor linked
  // to one customer must never have another customer's subscription written
  // onto them. The metadata matching is not enough on its own to rule it out.
  if (profile?.stripeCustomerId && profile.stripeCustomerId !== customerId) {
    logger.error('Checkout confirm refused: session customer disagrees with the profile linkage', {
      sessionId,
      profileId: profile.id,
    })
    return { outcome: 'not_found' }
  }

  // The webhook usually wins. Answering from the row it wrote keeps this off
  // the lock pool, which is the resource a burst is short of.
  if (profile?.stripeSubscriptionId === subscriptionId && deriveVisitorMembership(profile).active) {
    return { outcome: 'already_current', membershipActive: true }
  }

  const result = await resyncSubscription(subscriptionId)
  const after = await findVisitorProfileByAuthUserId(visitorAuthUserId)

  if (result.profileId !== null && after && result.profileId !== after.id) {
    logger.error('Checkout confirm resynced a profile that is not the signed-in visitor', {
      sessionId,
      resyncedProfileId: result.profileId,
      profileId: after.id,
    })
    return { outcome: 'resynced', membershipActive: false }
  }

  return { outcome: 'resynced', membershipActive: deriveVisitorMembership(after).active }
}
