import type { Metadata } from 'next';
import Link from '@/components/navigation/PublicLink';

import { LIMA_HREF } from '@/lib/routing/peruLaunch';

export const metadata: Metadata = {
  title: 'About — Questurian',
  description: 'What Questurian publishes, what is free, and how the site is paid for.',
  alternates: { canonical: '/about' },
};

/**
 * About. Like the privacy and terms text, it states only what is true of the
 * site today. Who writes, where they live and what they visited are the
 * owner's facts: do not add a name, a biography or a "we went" from anywhere
 * but the owner. Advertising going live means a line under "How we are paid"
 * in the same deploy as the privacy change (docs/procedures/ads.md).
 */
export default function AboutPage() {
  const heading = 'font-display text-[1.15rem] 480:text-[1.3rem] text-foreground mt-10 mb-3';
  const body = 'text-[0.95rem] leading-[1.75] text-foreground/80 mb-4';
  const link = 'text-accent underline underline-offset-2';

  return (
    <main className="px-4 480:px-6 pt-10 pb-20 768:pt-14">
      <article className="max-w-2xl mx-auto">
        <h1 className="font-display text-[1.8rem] 480:text-[2.2rem] text-foreground leading-[1.15]">
          About Questurian
        </h1>

        <p className={`${body} mt-6`}>
          Questurian is an independent travel publication, starting with{' '}
          <Link href={LIMA_HREF} className={link}>Lima, Peru</Link>. Our guides are for the
          decisions that make or break a trip: which neighborhood to stay in, what to eat and
          where, what to book ahead, and how to get home at night.
        </p>

        <h2 className={heading}>What we publish</h2>
        <p className={body}>
          City and neighborhood guides, practical articles on safety and getting around, map
          guides to restaurants, bars and sights, and itineraries planned day by day. Lima is
          where most of our work is. We also publish some guides to the rest of South America.
        </p>

        <h2 className={heading}>What is free</h2>
        <p className={body}>
          You can read our free articles without an account, starting with{' '}
          <Link href={`${LIMA_HREF}/guides/questurian-guide-lima`} className={link}>
            the Questurian Guide to Lima
          </Link>
          . A <Link href="/join" className={link}>membership</Link> opens the rest, including the
          members-only maps, itineraries and audio.
        </p>

        <h2 className={heading}>How we choose</h2>
        <p className={body}>
          Every place we recommend is chosen by our editors. Prices, hours and menus change, so
          check with a place before you build a day around it. If we have something wrong,{' '}
          <Link href="/contact" className={link}>tell us</Link>.
        </p>

        <h2 className={heading}>How we are paid</h2>
        <p className={body}>
          Through memberships and affiliate links. If you book or buy through an affiliate link,
          we may earn a commission at no extra cost to you. It never decides what we write about.
        </p>
      </article>
    </main>
  );
}
