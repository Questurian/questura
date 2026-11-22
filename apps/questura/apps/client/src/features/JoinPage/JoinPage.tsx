import { Suspense } from 'react'

import { isLocalJoinPreview, readJoinPricing, type JoinPricing } from '@/features/Payments/lib/joinPlans'
import { formatPlanAmount } from '@/features/Payments/lib/planPresentation'
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
async function LivePlans({ pricing, preview }: { pricing: Promise<JoinPricing>; preview: boolean }) {
  const { plans, taxAtCheckout } = await pricing
  return (
    <>
      <JoinPlans plans={plans} taxAtCheckout={taxAtCheckout} preview={preview} />
      <JoinFooter taxAtCheckout={taxAtCheckout} />
    </>
  )
}

/**
 * The end of B's first button on phones (owner, 2026-11-22: "it's so cheap").
 * From the same read as the plan cards, never typed in. Not a monthly plan
 * billed every month: the button stays "Become a member".
 */
async function StartPrice({ pricing }: { pricing: Promise<JoinPricing> }) {
  const monthly = (await pricing).plans.find((plan) => plan.id === 'monthly')
  if (monthly?.interval !== 'month' || monthly.intervalCount !== 1) return null
  return <span className="jp-start-price">{` for ${formatPlanAmount(monthly)} a month`}</span>
}

function Plans({ pricing, preview }: { pricing: Promise<JoinPricing>; preview: boolean }) {
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
      <LivePlans pricing={pricing} preview={preview} />
    </Suspense>
  )
}

/**
 * /join: one of the two selling designs, then the shared plans, footer and
 * bottom bar. The plans say the same in A and B; B draws them dark and puts
 * the monthly price on its first button on phones.
 *
 * `variant` is set only on the test's own pages (`/join/test-a`, `/join/test-b`,
 * served at `/join` by middleware). It marks the page for the reader journey
 * recorder, which reports it as a `variant` event. Previews and the plain
 * page carry no marker and are never counted as the test.
 */
export default function JoinPage({ design, variant }: { design: JoinDesign; variant?: JoinDesign }) {
  // With a localhost frontend the page shows fixture prices and dead buttons.
  const preview = isLocalJoinPreview(config.frontendUrl)
  // One read for the button and the cards, so the two can never disagree.
  const pricing = readJoinPricing(config.backendUrl, preview)
  return (
    <div
      className={design === 'A' ? 'jp jp--a' : 'jp jp--b'}
      data-join-variant={variant}
    >
      {design === 'A' ? (
        <TripPage />
      ) : (
        <FrontPage
          startPrice={
            <Suspense fallback={null}>
              <StartPrice pricing={pricing} />
            </Suspense>
          }
        />
      )}
      <Plans pricing={pricing} preview={preview} />
      <PlansBar />
    </div>
  )
}
