import Link from '@/components/navigation/PublicLink';
import MembershipShowcase from './MembershipShowcase';
import PlanLink from './PlanLink';
import messages from '../../../../messages/en.json';
import {
  formatPerMonthEquivalent,
  formatPlanAmount,
  formatPlanInterval,
  getAnnualSaving,
  type MembershipPlan,
} from '../lib/planPresentation';

const tickerItems = [
  'Neighborhood deep-dives',
  'Day-by-day itineraries',
  'Food & restaurant guides',
  'Written by locals',
  'Every city we cover',
  'No paywalls',
  'Always publishing',
];

/*
 * The same on both cards: the plans differ only in billing. Every line must be
 * something membership really gives today (Design 101 also listed audio
 * versions of articles, which the site does not have).
 */
const planBenefits = [
  'Every article, no paywalls',
  'Local food & neighborhood guides',
  'Day-by-day travel itineraries',
  'All our local travel experts',
];

function PlanArrowLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  const content = (
    <>
      <span>{label}</span>
      <svg viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle className="join-plan-arrow-ring-track" cx="28" cy="28" r="25" strokeWidth="1.5" />
        <circle
          className="join-plan-arrow-ring-progress"
          cx="28"
          cy="28"
          r="25"
          pathLength="100"
          strokeWidth="1.5"
        />
        <path
          d="M20 28H36M30 22L36 28L30 34"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  // The label is hidden on phones, where the whole card is the link, so the
  // accessible name is set explicitly to the same words.
  return disabled ? (
    <span role="link" aria-disabled="true" aria-label={label} className="join-plan-arrow">
      {content}
    </span>
  ) : (
    <PlanLink href={href} prefetch={false} aria-label={label} className="join-plan-arrow">
      {content}
    </PlanLink>
  );
}

function PlanBenefits({ planName }: { planName: string }) {
  return (
    <ul className="join-plan-benefits" aria-label={`${planName} membership includes`}>
      {planBenefits.map((benefit) => (
        <li key={benefit}>{benefit}</li>
      ))}
    </ul>
  );
}

/**
 * The annual card, priced from the catalog ($79.99/year), with its saving
 * against twelve months at the monthly rate. See docs/membership-pricing.md.
 */
function AnnualPlanCard({
  plan,
  monthly,
  preview,
}: {
  plan: MembershipPlan;
  monthly: MembershipPlan | null;
  preview: boolean;
}) {
  const saving = getAnnualSaving(plan, monthly);
  const perMonth = formatPerMonthEquivalent(plan);

  return (
    <div className="join-plan-card join-plan-card--annual">
      <div className="join-plan-content">
        <div className="join-plan-heading">
          <h3 className="join-plan-name">Annual</h3>
          {saving ? <span className="join-plan-badge">Save {saving.percentOff}%</span> : null}
        </div>
        <div className="join-plan-price">
          <span className="join-plan-amount">{formatPlanAmount(plan)}</span>
          <span className="join-plan-unit">/{formatPlanInterval(plan)}</span>
        </div>
        {perMonth || saving ? (
          <p className="join-plan-billing">
            {perMonth ? <>{perMonth} a month, paid yearly</> : null}
            {perMonth && saving ? <br /> : null}
            {saving ? (
              <span>
                <s>
                  <span className="sr-only">Full price at the monthly rate: </span>
                  {saving.compareAt}
                </s>{' '}
                at the monthly rate
              </span>
            ) : null}
          </p>
        ) : null}
        <PlanBenefits planName="Annual" />
        <PlanArrowLink href="/purchase/yearly" label="Choose annual" disabled={preview} />
      </div>
    </div>
  );
}

function MonthlyPlanCard({ plan, preview }: { plan: MembershipPlan; preview: boolean }) {
  return (
    <div className="join-plan-card">
      <div className="join-plan-content">
        <div className="join-plan-heading">
          <h3 className="join-plan-name">Monthly</h3>
        </div>
        <div className="join-plan-price">
          <span className="join-plan-amount">{formatPlanAmount(plan)}</span>
          <span className="join-plan-unit">/{formatPlanInterval(plan)}</span>
        </div>
        <PlanBenefits planName="Monthly" />
        <PlanArrowLink href="/purchase/monthly" label="Choose monthly" disabled={preview} />
      </div>
    </div>
  );
}

/**
 * The tax line under the prices. Checkout adds sales tax/VAT only while Stripe
 * Managed Payments is on (the plans endpoint's `taxAtCheckout`); with it off,
 * checkout charges the plain price, so the page promises no tax.
 */
export function pricingTermsText(taxAtCheckout: boolean): string {
  return taxAtCheckout
    ? 'All prices are in U.S. dollars. Sales tax or VAT is added at checkout where it applies, and checkout may show the total in your own currency. Subscriptions renew automatically at the end of each billing period.'
    : 'All prices are in U.S. dollars. Subscriptions renew automatically at the end of each billing period.';
}

export default function PricingDisplay({
  plans,
  preview = false,
  taxAtCheckout = false,
}: {
  plans: MembershipPlan[];
  preview?: boolean;
  /** From `/api/payments/plans`; false (no tax promise) when unknown. */
  taxAtCheckout?: boolean;
}) {
  const monthly = plans.find((plan) => plan.id === 'monthly') ?? null;
  const yearly = plans.find((plan) => plan.id === 'yearly') ?? null;

  const annualPerMonth = yearly ? formatPerMonthEquivalent(yearly) : null;
  const hasBothPlans = Boolean(monthly && yearly);

  // No plan means nothing is purchasable, so the page says so instead of
  // advertising a number the checkout would not honour.
  const hasAnyPlan = Boolean(monthly || yearly);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ── Departures-board ticker ── */}
      <div
        className="join-ticker overflow-hidden border-y border-[#1A1A1A]/15 py-3"
        aria-hidden="true"
      >
        <div className="join-ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {tickerItems.map((item) => (
                <span
                  key={item}
                  className="
                    flex items-center font-mono text-[0.64rem] uppercase
                    tracking-[0.2em] text-[#1A1A1A]/65
                    480:text-[0.68rem]
                  "
                >
                  <span className="px-5 480:px-7">{item}</span>
                  <span className="text-[0.5rem] text-[#9DACF2]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Plans ── */}
      <section
        id="plans"
        className="scroll-mt-28 px-5 pt-12 pb-10 max-w-5xl mx-auto 768:px-8 768:pt-16"
      >
        <div className="mb-8 text-center 768:mb-10">
          <h2 className="font-display text-[2rem] font-semibold leading-tight text-[#1A1A1A] 768:text-[2.4rem]">
            {hasBothPlans ? 'Choose your plan.' : 'Become a member.'}
          </h2>
          <p className="mt-2 text-[0.9rem] text-[#6f6a62]">
            {hasBothPlans ? 'Full access with either plan. ' : null}
            <strong className="font-semibold text-[#1A1A1A]">
              Cancel anytime.
            </strong>
          </p>
        </div>

        {preview ? (
          <p className="mb-6 text-center text-sm text-foreground" role="status">
            {messages.join.localPreview}
          </p>
        ) : null}
        {hasAnyPlan ? (
          <div className={`join-plans-grid${hasBothPlans ? '' : ' join-plans-grid--single'}`}>
            {monthly ? <MonthlyPlanCard plan={monthly} preview={preview} /> : null}
            {/* Absent from Stripe means absent here. */}
            {yearly ? (
              <AnnualPlanCard plan={yearly} monthly={monthly} preview={preview} />
            ) : null}
          </div>
        ) : (
          <p className="py-10 text-center text-[0.9rem] text-[#6f6a62]">
            Memberships are temporarily unavailable. Please try again shortly.
          </p>
        )}

        {hasAnyPlan ? (
          <p className="mt-6 text-center text-[0.72rem] tracking-[0.01em] text-[#9a9894]">
            Secure payment via Stripe · Visa, Mastercard, American Express,
            Apple&nbsp;Pay
          </p>
        ) : null}
      </section>

      <MembershipShowcase />

      {/* ── Closing invitation ── */}
      <section id="membership" className="join-closing" aria-labelledby="join-closing-title">
        <div className="join-closing-content">
          <h2 id="join-closing-title">Your next trip deserves better than guesswork.</h2>
          <a href="#plans" className="join-closing-cta">
            Become a member
          </a>
          {annualPerMonth ? (
            <p className="join-closing-price">From {annualPerMonth} a month, billed annually</p>
          ) : monthly ? (
            <p className="join-closing-price">
              {formatPlanAmount(monthly)} per {formatPlanInterval(monthly)}, cancel anytime
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Dark Footer ── */}
      <footer className="bg-[#1A1A1A] text-white">
        <div className="max-w-2xl mx-auto px-6 py-10 768:py-12">
          {/* Terms */}
          <div className="text-[0.71rem] text-white/50 leading-[1.85] space-y-4 mb-8">
            <p data-testid="join-pricing-terms">{pricingTermsText(taxAtCheckout)}</p>
          </div>

          {/* Links */}
          <div className="border-t border-white/10 pt-6">
            <div
              className="
                flex flex-wrap justify-center gap-x-3 gap-y-2
                text-[0.69rem] text-white/45 mb-6
              "
            >
              <Link
                href="/terms"
                className="underline underline-offset-2 hover:text-white/70 transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-white/20">|</span>
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:text-white/70 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-white/20">|</span>
              <Link
                href="/faq"
                className="underline underline-offset-2 hover:text-white/70 transition-colors"
              >
                Subscription FAQ
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/10 pt-5 text-center">
            <p className="text-[0.67rem] text-white/30">
              © 2026 Questurian. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
