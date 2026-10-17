import { adFrameResponse } from '../src/features/ads/lib/adFrameResponse.ts'

type CloudflareRequest = Request & { cf?: { country?: string } }

/** ads.questurian.com. All of its behaviour, and why: `adFrameResponse`. */
const adFrameWorker = {
  fetch: (request: CloudflareRequest) => adFrameResponse(request, request.cf?.country),
}

export default adFrameWorker
