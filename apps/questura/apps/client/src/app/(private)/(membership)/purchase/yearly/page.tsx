import type { Metadata } from 'next';
import PurchasePage from '@/features/Payments/pages/PurchasePage';

// A checkout step, not a search result. /join is the page to find.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function PurchaseYearly() {
  return (
    <PurchasePage
      planName="Annual Plan"
      plan="yearly"
      planDescription="Billed once a year • All features included"
    />
  );
}
