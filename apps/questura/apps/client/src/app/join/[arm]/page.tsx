import { notFound } from 'next/navigation';
import JoinPage, { type JoinDesign } from '@/features/JoinPage/JoinPage';
import { joinMetadata } from '../joinMetadata';

export const metadata = joinMetadata;
export const dynamic = 'force-static';
export const revalidate = 60;
export const dynamicParams = false;

/**
 * The pages middleware serves at /join (src/middleware.ts). Never linked and
 * never in the sitemap: typed in directly, each answers 404 from middleware.
 *
 *   test-a, test-b  the 50/50 test's two arms, marked for the recorder
 *   show-a, show-b  previews (`/join?show=a`), unmarked, never recorded
 */
const ARMS: Record<string, { design: JoinDesign; variant?: JoinDesign }> = {
  'test-a': { design: 'A', variant: 'A' },
  'test-b': { design: 'B', variant: 'B' },
  'show-a': { design: 'A' },
  'show-b': { design: 'B' },
};

export function generateStaticParams() {
  return Object.keys(ARMS).map((arm) => ({ arm }));
}

export default async function JoinArm({ params }: { params: Promise<{ arm: string }> }) {
  const arm = ARMS[(await params).arm];
  if (!arm) notFound();
  return <JoinPage design={arm.design} variant={arm.variant} />;
}
