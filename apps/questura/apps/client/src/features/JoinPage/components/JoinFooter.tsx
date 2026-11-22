import Link from '@/components/navigation/PublicLink'

/**
 * The legal line under the plans. `join.spec.ts` reads it by
 * `data-testid="join-pricing-terms"`; checkout adds tax only while Stripe
 * Managed Payments is on, so the tax sentence follows `taxAtCheckout`.
 */
export function pricingTermsText(taxAtCheckout: boolean): string {
  return taxAtCheckout
    ? 'All prices are in U.S. dollars. Sales tax or VAT is added at checkout where it applies, and checkout may show the total in your own currency. Subscriptions renew automatically at the end of each billing period.'
    : 'All prices are in U.S. dollars. Subscriptions renew automatically at the end of each billing period.'
}

const LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/faq', label: 'Subscription FAQ' },
]

export default function JoinFooter({ taxAtCheckout }: { taxAtCheckout: boolean }) {
  return (
    <footer className="jp-footer">
      <div className="jp-container">
        <p data-testid="join-pricing-terms">{pricingTermsText(taxAtCheckout)}</p>
        <ul className="jp-footer-links">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} prefetch={false}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p>© 2026 Questurian. All rights reserved.</p>
      </div>
    </footer>
  )
}
