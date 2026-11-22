import type { BetterAuthPlugin } from 'better-auth'
import {
  APIError,
  createAuthEndpoint,
  createEmailVerificationToken,
  formCsrfMiddleware,
} from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import * as z from 'zod'

import { normalizeEmail } from '@/shared/lib/normalize-email'

export const CHECKOUT_SIGN_UP_PATH = '/sign-up/checkout'

/**
 * Sign-up for a buyer: an email now, a password after paying.
 *
 * It is `/sign-up/email` without the credential row, and nothing more. Checkout
 * still needs a session and Stripe ownership is still `visitorAuthUserId`, so
 * no payment is ever matched to a person by a typed address
 * (`payments/lib/customer-linkage.ts`).
 *
 * The rules that keep it safe:
 *
 * - **An address that has an account never gets a session here**, whatever
 *   that account holds (a password, Google, or neither). Anything else is a
 *   takeover by typing someone's email. They sign in, or use the reset link,
 *   which creates the password for an account that has none.
 * - The address starts unverified, exactly as with a password sign-up.
 * - The body is an email and nothing else: no name, callback or user field is
 *   taken from the caller.
 * - It lives on Better Auth's router, so the origin and CSRF checks, the rate
 *   limit, Turnstile, the staff-email refusal and the profile hook all apply.
 *   The last three are keyed by path in `better-auth.ts`.
 */
export function checkoutSignUp({ verificationCallbackURL }: { verificationCallbackURL: string }) {
  return {
    id: 'checkout-sign-up',
    endpoints: {
      signUpCheckout: createAuthEndpoint(
        CHECKOUT_SIGN_UP_PATH,
        {
          method: 'POST',
          body: z.object({ email: z.string().trim().max(254).pipe(z.email()) }),
          use: [formCsrfMiddleware],
        },
        async (ctx) => {
          const email = normalizeEmail(ctx.body.email)
          const { internalAdapter } = ctx.context
          const refuseExisting = () =>
            new APIError('UNPROCESSABLE_ENTITY', {
              code: 'USER_ALREADY_EXISTS',
              message: 'An account already uses this email. Sign in to continue.',
            })

          if (await internalAdapter.findUserByEmail(email)) throw refuseExisting()

          let user: Awaited<ReturnType<typeof internalAdapter.createUser>>
          try {
            user = await internalAdapter.createUser(
              { email, name: '', emailVerified: false },
              { method: 'email-password' },
            )
          } catch (error) {
            // Two submits at once: the unique index lets one through. The
            // loser is an existing account, never a second session.
            if (await internalAdapter.findUserByEmail(email)) throw refuseExisting()
            throw error
          }

          const send = ctx.context.options.emailVerification?.sendVerificationEmail
          if (send) {
            const token = await createEmailVerificationToken(
              ctx.context.secret,
              user.email,
              undefined,
              ctx.context.options.emailVerification?.expiresIn,
            )
            const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent(verificationCallbackURL)}`
            await ctx.context.runInBackgroundOrAwait(send({ user, url, token }, ctx.request))
          }

          const session = await internalAdapter.createSession(user.id)
          await setSessionCookie(ctx, { session, user })

          return ctx.json({ success: true })
        },
      ),
    },
  } satisfies BetterAuthPlugin
}
