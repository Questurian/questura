import { BookOpen, Headphones, MapPin, Route } from 'lucide-react'

import PlanLink from '@/features/Payments/components/PlanLink'
import {
  formatPerMonthEquivalent,
  formatPlanAmount,
  formatPlanInterval,
  getAnnualSaving,
  type MembershipPlan,
} from '@/features/Payments/lib/planPresentation'
import messages from '../../../../messages/en.json'

/*
 * "Choose your plan": identical in A and B, so the test measures only the
 * selling part above it. Annual first (owner, 2026-11-22). Every figure comes
 * from the plans endpoint through planPresentation.ts, never typed in. The
 * recorder reads `.join-plan-card`, `.join-plan-name` and `.join-plan-price`
 * (lib/journey/observe.ts): keep all three.
 */

/** Only what membership really gives today. Audio exists on one guide, so it says so. */
const BENEFITS = [
  { Icon: Route, text: <><span className="jp-nowrap">Day-by-day</span> itineraries</> },
  { Icon: MapPin, text: 'Every map, every pin' },
  { Icon: BookOpen, text: 'Every guide we publish' },
  { Icon: Headphones, text: 'The Lima guide, read aloud' },
]

/** "a year", or "every 3 months" when Stripe bills in multiples. */
function per(plan: MembershipPlan): string {
  return plan.intervalCount === 1 ? `a ${plan.interval}` : `every ${formatPlanInterval(plan)}`
}

function PlanButton({ href, label, preview }: { href: string; label: string; preview: boolean }) {
  return preview ? (
    <span role="link" aria-disabled="true" className="join-plan-button">
      {label}
    </span>
  ) : (
    <PlanLink href={href} prefetch={false} className="join-plan-button">
      {label}
    </PlanLink>
  )
}

function PlanCard({
  name,
  plan,
  note,
  badge,
  href,
  button,
  preview,
  annual = false,
}: {
  name: string
  plan: MembershipPlan
  note: string | null
  badge: string | null
  href: string
  button: string
  preview: boolean
  annual?: boolean
}) {
  return (
    <div className={`join-plan-card jp-plan${annual ? ' jp-plan--annual' : ''}`}>
      <div className="jp-plan-copy">
        <div className="jp-plan-head">
          <h3 className="join-plan-name">{name}</h3>
          {badge ? <span className="jp-plan-badge">{badge}</span> : null}
        </div>
        <p className="join-plan-price">
          <span className="jp-plan-amount">{formatPlanAmount(plan)}</span> {per(plan)}
        </p>
        {note ? <p className="jp-plan-note">{note}</p> : null}
      </div>
      <PlanButton href={href} label={button} preview={preview} />
    </div>
  )
}

/**
 * The line under the cards. Tax is promised only while checkout adds it
 * (`taxAtCheckout`, Stripe Managed Payments on).
 */
function termsLine(taxAtCheckout: boolean): string {
  return taxAtCheckout
    ? 'Renews automatically. Cancel anytime. Sales tax or VAT is added at checkout where it applies.'
    : 'Renews automatically. Cancel anytime.'
}

export default function JoinPlans({
  plans,
  taxAtCheckout,
  preview,
}: {
  plans: MembershipPlan[]
  taxAtCheckout: boolean
  preview: boolean
}) {
  const monthly = plans.find((plan) => plan.id === 'monthly') ?? null
  const yearly = plans.find((plan) => plan.id === 'yearly') ?? null
  const saving = yearly ? getAnnualSaving(yearly, monthly) : null
  const perMonth = yearly ? formatPerMonthEquivalent(yearly) : null
  const both = Boolean(monthly && yearly)

  return (
    <section id="plans" className="jp-plans" aria-labelledby="plans-title">
      <div className="jp-container">
        <h2 id="plans-title" className="jp-section-title">
          {both ? 'Choose your plan' : 'Become a member'}
        </h2>
        <ul className="jp-benefits">
          {BENEFITS.map(({ Icon, text }, i) => (
            <li key={i}>
              <Icon className="jp-icon-24" aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        {monthly || yearly ? (
          <>
            <div className={`jp-plan-cards${both ? '' : ' jp-plan-cards--single'}`}>
              {yearly ? (
                <PlanCard
                  annual
                  name="Annual"
                  plan={yearly}
                  badge={saving ? `Save ${saving.percentOff}%` : null}
                  note={perMonth ? `${perMonth} a month, paid yearly` : null}
                  href="/purchase/yearly"
                  button="Choose annual"
                  preview={preview}
                />
              ) : null}
              {monthly ? (
                <PlanCard
                  name="Monthly"
                  plan={monthly}
                  badge={null}
                  note={`Billed every ${formatPlanInterval(monthly)}`}
                  href="/purchase/monthly"
                  button="Choose monthly"
                  preview={preview}
                />
              ) : null}
            </div>
            <p className="jp-plans-terms">{termsLine(taxAtCheckout)}</p>
          </>
        ) : (
          <p className="jp-plans-terms">Memberships are temporarily unavailable. Please try again shortly.</p>
        )}
        {/* Local only: the plan buttons are dead under a localhost frontend. */}
        {preview ? (
          <p className="jp-preview-note" role="status">
            {messages.join.localPreview}
          </p>
        ) : null}
      </div>
    </section>
  )
}
