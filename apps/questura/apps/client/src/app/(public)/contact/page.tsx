import type { Metadata } from 'next';
import Link from '@/components/navigation/PublicLink';

import {
  ACCOUNT_DELETION_DAYS,
  ACCOUNT_DELETION_EMAIL,
  ACCOUNT_DELETION_MAILTO,
} from '@/lib/accountDeletion';

export const metadata: Metadata = {
  title: 'Contact — Questurian',
  description: 'Email Questurian about a correction, your membership, your data or anything else.',
  alternates: { canonical: '/contact' },
};

/**
 * Contact, by email on purpose: a form would be another public write endpoint
 * to defend. The site has one inbox (`lib/accountDeletion.ts`). No reply time
 * is promised, except the deletion window the privacy page already states.
 */
export default function ContactPage() {
  const heading = 'font-display text-[1.15rem] 480:text-[1.3rem] text-foreground mt-10 mb-3';
  const body = 'text-[0.95rem] leading-[1.75] text-foreground/80 mb-4';
  const link = 'text-accent underline underline-offset-2';
  const mailto = (subject: string) =>
    `mailto:${ACCOUNT_DELETION_EMAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <main className="px-4 480:px-6 pt-10 pb-20 768:pt-14">
      <article className="max-w-2xl mx-auto">
        <h1 className="font-display text-[1.8rem] 480:text-[2.2rem] text-foreground leading-[1.15]">
          Contact
        </h1>

        <p className={`${body} mt-6`}>
          Email{' '}
          <a href={`mailto:${ACCOUNT_DELETION_EMAIL}`} className={link}>
            {ACCOUNT_DELETION_EMAIL}
          </a>{' '}
          about anything on Questurian.
        </p>

        <h2 className={heading}>Corrections</h2>
        <p className={body}>
          A place has closed, a price has moved, or we got something wrong:{' '}
          <a href={mailto('Correction')} className={link}>send a correction</a>. Include the link
          to the page and what should change.
        </p>

        <h2 className={heading}>Membership</h2>
        <p className={body}>
          You can cancel from your account page, and the{' '}
          <Link href="/faq" className={link}>membership FAQ</Link> covers plans and billing. For
          anything else, <a href={mailto('Membership')} className={link}>email us about your membership</a>{' '}
          from the address you signed up with. Never send card numbers or passwords by email.
        </p>

        <h2 className={heading}>Your data</h2>
        <p className={body}>
          To have your account deleted,{' '}
          <a href={ACCOUNT_DELETION_MAILTO} className={link}>email us</a> from the address you
          sign in with. We delete it within {ACCOUNT_DELETION_DAYS} days. The{' '}
          <Link href="/privacy" className={link}>privacy page</Link> says what we keep.
        </p>

        <h2 className={heading}>Businesses and press</h2>
        <p className={body}>
          To fix the details of a place we list, or for a press question,{' '}
          <a href={mailto('Business or press')} className={link}>write to the same inbox</a>.
        </p>
      </article>
    </main>
  );
}
