import { NextRequest, NextResponse } from 'next/server'

import { APP_CONFIG } from '@/shared/config'
import { forbiddenOriginResponse, getPrivateCorsHeaders, isAllowedOrigin } from '@/shared/utils/cors'
import { devToolsRefusal, isLocalHost } from '@/features/dev-tools/membership-states'

/**
 * The refusals every `/api/dev/*` route starts with. Each stands on its own:
 * 404 in production mode (every Railway deploy) or against a database that is
 * not on this machine, 403 unless the caller is a localhost page.
 */
export function devRouteGuard(req: NextRequest): { corsHeaders: Record<string, string>; refused: NextResponse | null } {
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
