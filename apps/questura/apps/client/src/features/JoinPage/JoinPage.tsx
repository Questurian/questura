import { Suspense } from 'react'

import { isLocalJoinPreview, LOCAL_JOIN_PLANS, readJoinPricing } from '@/features/Payments/lib/joinPlans'
import { config } from '@/lib/config'
import messages from '../../../messages/en.json'
import JoinFooter from './components/JoinFooter'
import JoinPlans from './components/JoinPlans'
import PlansBar from './components/PlansBar'
import FrontPage from './FrontPage'
import TripPage from './TripPage'

export type JoinDesign = 'A' | 'B'

// A failed plans read throws on purpose (joinPlans.ts): on revalidation Next
// keeps the last good /join instead of caching "nothing for sale".
async function LivePlans() {
  const { plans, taxAtCheckout } = await readJoinPricing(config.backendUrl, false)
  return (
    <>
      <JoinPlans plans={plans} taxAtCheckout={taxAtCheckout} preview={false} />
      <JoinFooter taxAtCheckout={taxAtCheckout} />
    </>
  )
}

function Plans() {
  // With a localhost frontend the page shows fixture prices and dead buttons.
  if (isLocalJoinPreview(config.frontendUrl)) {
    return (
      <>
        <JoinPlans plans={LOCAL_JOIN_PLANS} taxAtCheckout={false} preview />
        <JoinFooter taxAtCheckout={false} />
      </>
    )
  }
  return (
    <Suspense
      fallback={
        <section id="plans" className="jp-plans">
          <p role="status" className="jp-container jp-plans-terms">
            {messages.join.loadingPlans}
          </p>
        </section>
      }
    >
      <LivePlans />
    </Suspense>
  )
}

/**
 * /join: one of the two selling designs, then the shared plans, footer and
 * bottom bar. Only the part above the plans differs between A and B, so the
 * test measures the selling and nothing else.
 *
 * `variant` is set only on the test's own pages (`/join/test-a`, `/join/test-b`,
 * served at `/join` by middleware). It marks the page for the reader journey
 * recorder, which reports it as a `variant` event. Previews and the plain
 * page carry no marker and are never counted as the test.
 */
export default function JoinPage({ design, variant }: { design: JoinDesign; variant?: JoinDesign }) {
  return (
    <div
      className={design === 'A' ? 'jp jp--a' : 'jp jp--b'}
      data-join-variant={variant}
    >
      {design === 'A' ? <TripPage /> : <FrontPage />}
      <Plans />
      <PlansBar />
    </div>
  )
}
