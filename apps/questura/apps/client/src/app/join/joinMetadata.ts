import type { Metadata } from 'next';

const title = 'Join Questurian — Every Article and Itinerary, One Membership';
// No price here on purpose: metadata is static, so any figure in it would
// drift from the Stripe price the page and checkout actually use. The share
// card carries no price either. Only claims the owner has confirmed: the
// site covers Lima, and membership opens every guide.
const description =
  'One membership opens every guide we publish: where to eat, drink and stay in Lima, day-by-day itineraries, and every place on a map. Monthly or annual, cancel anytime.';
const shareImage = {
  url: '/images/join/join-share-1200x630.jpg',
  width: 1200,
  height: 630,
  alt: 'Questurian membership: every article, every itinerary.',
};

/**
 * One object for /join and every page served at /join (the test's two arms
 * and the previews): all canonical to /join, none in the sitemap. The
 * subscribe link is the one shared most, so it needs a full link preview.
 * Relative URLs resolve against the root layout's `metadataBase`.
 */
export const joinMetadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/join' },
  openGraph: {
    type: 'website',
    siteName: 'Questurian',
    title,
    description,
    url: '/join',
    images: [shareImage],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [shareImage],
  },
};
