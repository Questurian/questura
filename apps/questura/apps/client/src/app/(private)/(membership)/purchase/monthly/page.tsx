import type { Metadata } from 'next';
import PurchasePage from '@/features/Payments/pages/PurchasePage';

// A checkout step, not a search result. /join is the page to find.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function PurchaseMonthly() {
  return (
    <PurchasePage
      planName="Monthly Plan"
      plan="monthly"
      planDescription="All features included"
    />
  );
}
