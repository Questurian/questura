import { NextRequest, NextResponse } from 'next/server'

import { APP_CONFIG } from '@/shared/config'
import { forbiddenOriginResponse, getPrivateCorsHeaders, isAllowedOrigin } from '@/shared/utils/cors'
import { visitorAuthPool } from '@/features/visitor-auth/lib/better-auth'
import { lookupVisitorSession } from '@/features/visitor-auth/lib/current-principal'
import {
  DEV_MEMBERSHIP_STATES,
  devToolsRefusal,
  isDevMembershipStateName,
  isLocalHost,
  readDevMembershipState,
  writeDevMembershipState,
} from '@/features/dev-tools/membership-states'

/**
 * The localhost DEV switcher's backend: read or set the signed-in visitor's
 * membership state on the local database, the same write `pnpm dev:member`
 * makes. Nothing here reaches Stripe.
 *
 * It does not exist anywhere but a Mac: every call answers 404 in production
 * mode (every Railway deploy) or against a database that is not on this
 * machine, and 403 unless the caller is a localhost page. Each refusal stands
 * on its own.
 */
export const dynamic = 'force-dynamic'

const STATES = Object.entries(DEV_MEMBERSHIP_STATES).map(([name, { label, about, active }]) => ({ name, label, about, active }))

function guard(req: NextRequest): { corsHeaders: Record<string, string>; refused: NextResponse | null } {
  const corsHeaders = getPrivateCorsHeaders(req)
  if (devToolsRefusal({ NODE_ENV: process.env.NODE_ENV, databaseUri: APP_CONFIG.database.uri })) {
    return { corsHeaders, refused: NextResponse.json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } }) }
  }
  const blocked = forbiddenOriginResponse(req, corsHeaders)
  if (blocked) return { corsHeaders, refused: blocked }
  if (!isLocalOrigin(req.headers.get('origin'))) {
    return { corsHeaders, refused: NextResponse.json({ error: 'Origin not allowed.' }, { status: 403, headers: corsHeaders }) }
  }
  return { corsHeaders, refused: null }
}

function isLocalOrigin(origin: string | null): boolean {
  if (!origin || !isAllowedOrigin(origin)) return false
  try {
    return isLocalHost(new URL(origin).hostname)
  } catch {
    return false
  }
}

async function signedInUser(req: NextRequest) {
  const session = await lookupVisitorSession(req.headers, { freshSession: true })
  return session?.user ?? null
}

export async function GET(req: NextRequest) {
  const { corsHeaders, refused } = guard(req)
  if (refused) return refused

  const user = await signedInUser(req)
  if (!user) return NextResponse.json({ signedIn: false, states: STATES }, { headers: corsHeaders })

  const state = await readDevMembershipState(visitorAuthPool, user.id, Date.now())
  return NextResponse.json({ signedIn: true, email: user.email, state, states: STATES }, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const { corsHeaders, refused } = guard(req)
  if (refused) return refused

  const user = await signedInUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401, headers: corsHeaders })

  const body = (await req.json().catch(() => null)) as { state?: unknown } | null
  if (!isDevMembershipStateName(body?.state)) {
    return NextResponse.json({ error: 'Unknown state.' }, { status: 400, headers: corsHeaders })
  }

  const written = await writeDevMembershipState(visitorAuthPool, user.id, body.state, Date.now())
  if (!written) {
    return NextResponse.json({ error: 'No visitor profile yet. Reload the page once, then try again.' }, { status: 409, headers: corsHeaders })
  }

  return NextResponse.json({ state: body.state, active: DEV_MEMBERSHIP_STATES[body.state].active }, { headers: corsHeaders })
}

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders, refused } = guard(req)
  if (refused) return refused
  return new NextResponse('', { status: 200, headers: corsHeaders })
}
