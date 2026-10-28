import { NextRequest, NextResponse } from 'next/server'

import { visitorAuth, visitorAuthPool } from '@/features/visitor-auth/lib/better-auth'
import { ensureVisitorProfileForAuthUser } from '@/features/visitor-auth/lib/visitor-profile'
import { DEV_MEMBERSHIP_STATES, readDevMembershipState } from '@/features/dev-tools/membership-states'
import { DevLoginError, readOrCreateDevLogin, type DevLogin } from '@/features/dev-tools/dev-login'
import { devRouteGuard } from '@/features/dev-tools/dev-route-guard'
import { logger } from '@/shared/utils/logger'

/**
 * Signs the saved localhost login in (`dev-login.ts`), so the DEV chip can do
 * it on arrival without anyone typing. It answers with the same session
 * cookie a normal sign-in sets, through Better Auth's own sign-in.
 *
 * First use creates that local account. It is created directly, not through
 * Better Auth's sign-up, because sign-up mails a verification link and the
 * Mac's Resend key is real.
 *
 * Same refusals as every `/api/dev/*` route: 404 in production mode or against
 * a database that is not on this machine, 403 unless the caller is a localhost
 * page. Every failure answers `{ error }` in words the chip shows as they are.
 */
export const dynamic = 'force-dynamic'

async function findUserId(email: string): Promise<string | null> {
  const { rows } = await visitorAuthPool.query('select id from visitor_auth_users where lower(email) = $1', [email])
  return (rows[0] as { id: string } | undefined)?.id ?? null
}

async function createLocalReader({ email, password }: DevLogin): Promise<void> {
  const context = await visitorAuth.$context
  const hash = await context.password.hash(password)
  const user = await context.internalAdapter.createUser({ email, name: 'Dev Reader', emailVerified: true })
  if (!user) throw new DevLoginError(`Could not create the local account ${email}.`)
  await context.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: hash })
  await ensureVisitorProfileForAuthUser({ id: user.id, email: user.email, name: user.name })
}

async function signIn(req: NextRequest, login: DevLogin): Promise<Response> {
  try {
    return await visitorAuth.api.signInEmail({ body: login, headers: req.headers, asResponse: true })
  } catch (error) {
    if (error instanceof Response) return error
    const status = (error as { statusCode?: number }).statusCode ?? 500
    return Response.json({ message: (error as Error).message }, { status })
  }
}

export async function POST(req: NextRequest) {
  const { corsHeaders, refused } = devRouteGuard(req)
  if (refused) return refused

  const fail = (error: string, status = 500) => {
    logger.error('Dev auto sign-in failed', { error })
    return NextResponse.json({ error }, { status, headers: corsHeaders })
  }

  try {
    const { login, created } = await readOrCreateDevLogin()
    if (!(await findUserId(login.email))) {
      if (!created) {
        return fail(`No local account for ${login.email} (the email in apps/server/.dev-login.json). Fix the email, or delete the file to start over.`, 409)
      }
      await createLocalReader(login)
    }

    const signedIn = await signIn(req, login)
    if (!signedIn.ok) {
      const body = (await signedIn.json().catch(() => ({}))) as { message?: string }
      const reason = signedIn.status === 401
        ? `The password in apps/server/.dev-login.json is not ${login.email}'s local password (a Google-only account has none). Fix it, or delete the file to start over.`
        : `Sign-in answered ${signedIn.status}${body.message ? `: ${body.message}` : ''}.`
      return fail(reason, signedIn.status === 401 ? 409 : 502)
    }

    const userId = await findUserId(login.email)
    if (userId) await ensureVisitorProfileForAuthUser({ id: userId, email: login.email, name: 'Dev Reader' })
    const state = userId ? await readDevMembershipState(visitorAuthPool, userId, Date.now()) : 'none'
    const active = state !== 'other' && DEV_MEMBERSHIP_STATES[state].active

    const response = NextResponse.json({ email: login.email, state, active }, { headers: corsHeaders })
    for (const cookie of signedIn.headers.getSetCookie()) response.headers.append('Set-Cookie', cookie)
    return response
  } catch (error) {
    return fail(error instanceof DevLoginError ? error.message : `Auto sign-in crashed: ${(error as Error).message}`)
  }
}

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders, refused } = devRouteGuard(req)
  if (refused) return refused
  return new NextResponse('', { status: 200, headers: corsHeaders })
}
