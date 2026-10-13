import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getPublicMainHomepage, isCuratedPageKey } from '@/features/homepage-featured-content'
import { readBudgetOverrideFromHeaders } from '@/features/homepage-featured-content/reference-grid/page-read-budget'
import { noteOnRequest } from '@/shared/observability/request-report'
import { admitPublicWork, publicRead } from '@/shared/http/public-read'
import { coalesce } from '@/shared/http/coalesce'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

// GET /api/public/section-pages/:page  (eat | stay | itineraries)
// No auth required: the published blocks of a navbar section page. Same
// response shape, rate limit and admission gate as the main homepage.
export async function GET(req: NextRequest, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  if (!isCuratedPageKey(page) || page === 'main') {
    return NextResponse.json({ message: 'Unknown section page.' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })

    return await publicRead({ req, scope: 'locationHomepage', payload }, async () => {
      const readBudget = readBudgetOverrideFromHeaders(req.headers)
      const skipCoalescing = readBudget.limit !== undefined || readBudget.disabled === true

      const admitted = () =>
        admitPublicWork('assembly', () => getPublicMainHomepage(payload, readBudget, page), req.signal)

      const { value, joined } = skipCoalescing
        ? { value: await admitted(), joined: false }
        : await coalesce(`section-page:${page}`, admitted)

      noteOnRequest('reads', value.stats.reads)
      noteOnRequest('deduped', value.stats.deduped)
      noteOnRequest('batches', value.stats.batches)
      noteOnRequest('prefetched', value.stats.prefetched)
      noteOnRequest('peak', `${value.stats.peakConcurrency}/${value.stats.limit}`)
      noteOnRequest('coalesced', joined ? 'joined' : 'ran')

      return NextResponse.json(value.body, { status: value.status })
    })
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error, 'Failed to load section page.') },
      { status: 500 },
    )
  }
}
