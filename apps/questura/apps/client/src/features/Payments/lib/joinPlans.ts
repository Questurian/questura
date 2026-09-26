// Relative with extensions so the node:test suite can load this file.
import { LastGood, validatedAtFrom } from '../../../lib/cache/lastGood.ts';
import { renderHeaders } from '../../../lib/cache/public-cache.ts';
import type { MembershipPlan } from './planPresentation';

/** What /join renders: the plans, and whether checkout adds tax. */
export type JoinPricing = { plans: MembershipPlan[]; taxAtCheckout: boolean };

// Presentation fixtures only. Never passed to a checkout request.
export const LOCAL_JOIN_PLANS: MembershipPlan[] = [
  { id: 'monthly', priceId: '', amount: 1299, currency: 'usd', interval: 'month', intervalCount: 1, productName: 'Questurian Membership', compareAtAmount: null },
  { id: 'yearly', priceId: '', amount: 7999, currency: 'usd', interval: 'year', intervalCount: 1, productName: 'Questurian Membership', compareAtAmount: null },
];

export function isLocalJoinPreview(frontendUrl: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(frontendUrl).hostname);
  } catch {
    return false;
  }
}

// The last good answer this process got, for a failed read (lastGood.ts).
const lastGoodPricing = new LastGood(1);

/**
 * Public, cached server read: no cookies, browser waterfall, or Stripe SDK.
 *
 * Sends the render headers (`x-questura-render-token`, and the origin key
 * when set) like every other server-side read. Without them every Worker
 * render of /join shared one per-IP rate budget with every other render, and
 * a 429 came back often enough to matter (2026-09-26 live sweep).
 *
 * A failed read — a 429, a 5xx, a timeout, an answer without a plan list —
 * is not "nothing for sale". It used to render "Memberships are temporarily
 * unavailable" and that page was cached for the full 60 s. Now it serves the
 * last good answer this process has (inside lastGood.ts's window) or throws.
 * A throw fails the render, and Next keeps serving the last good page while
 * it retries (the same rule as readPublicResponse.ts). Only a 200 that says
 * the list is empty renders the empty state, because that is the server's
 * real answer.
 *
 * `taxAtCheckout` is true only when the server says so: the page then makes
 * no tax promise by default, which is the safe side (a "plus tax" line over a
 * checkout that adds none is the bug this replaced). Live failures never fall
 * back to the local fixtures.
 */
export async function readJoinPricing(
  backendUrl: string,
  preview: boolean,
  request: typeof fetch = fetch,
  store: LastGood = lastGoodPricing,
): Promise<JoinPricing> {
  if (preview) return { plans: LOCAL_JOIN_PLANS, taxAtCheckout: false };

  const url = `${backendUrl}/api/payments/plans`;
  return store.read(
    url,
    async () => {
      const response = await request(url, {
        headers: { Accept: 'application/json', ...renderHeaders() },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`Failed to fetch membership plans: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.plans)) throw new Error('Membership plans answer has no plan list');
      return {
        value: { plans: data.plans, taxAtCheckout: data?.taxAtCheckout === true },
        validatedAt: validatedAtFrom(response),
      };
    },
    (error, info) => {
      console.warn(
        `[join] serving last good membership plans (origin confirmed ${Math.round(info.ageMs / 1000)}s ago):`,
        error instanceof Error ? error.message : error,
      );
    },
  );
}
