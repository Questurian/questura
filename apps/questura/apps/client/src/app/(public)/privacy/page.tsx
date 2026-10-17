import type { Metadata } from 'next';

import { AdChoice } from '@/features/ads/components/AdChoice';
import { ADS_LIVE } from '@/features/ads/lib/adUnits';

import {
  ACCOUNT_DELETION_DAYS,
  ACCOUNT_DELETION_EMAIL,
  ACCOUNT_DELETION_MAILTO,
} from '@/lib/accountDeletion';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Questurian keeps about you, why, and how to have it deleted.',
};

/**
 * The privacy text. It states what the code does and nothing more; change it
 * when the code changes. The deletion line is decision D2 of the launch fix
 * plan (by email at launch, handled within 30 days).
 *
 * The advertising lines follow `ADS_LIVE`: they appear in the same deploy that
 * turns the first ad unit on, so the page never claims "no advertising" while
 * ads run, nor describes an ad network that is not running. Bump "Last
 * updated" in that deploy.
 */
export default function PrivacyPage() {
  const heading = 'font-display text-[1.15rem] 480:text-[1.3rem] text-foreground mt-10 mb-3';
  const body = 'text-[0.95rem] leading-[1.75] text-foreground/80 mb-4';

  return (
    <main className="px-4 480:px-6 pt-10 pb-20 768:pt-14">
      <article className="max-w-2xl mx-auto">
        <h1 className="font-display text-[1.8rem] 480:text-[2.2rem] text-foreground leading-[1.15]">
          Privacy
        </h1>
        <p className="text-[0.85rem] text-foreground/60 mt-2">Last updated 17 October 2026</p>

        <p className={`${body} mt-6`}>
          {ADS_LIVE
            ? 'You can read Questurian without an account. Some pages show ads from one ad network, and we run no tracking scripts of our own. This page lists what we keep when you do sign up, and why.'
            : 'You can read Questurian without an account, and we do not run advertising or tracking scripts. This page lists what we keep when you do sign up, and why.'}
        </p>

        <h2 className={heading}>Your account</h2>
        <p className={body}>
          Your email address and name, and your password in a form that cannot be read back (a
          one-way hash). If you sign in with Google, we keep the link to your Google account. We
          use your address to sign you in and to send you account mail: verification and
          password-reset links, and a notice when your password, email address or sign-in
          methods change.
        </p>

        <h2 className={heading}>Signing in</h2>
        <p className={body}>
          Signing in sets a cookie that keeps you signed in for up to seven days. With each
          signed-in session we record the IP address and browser it started from, so suspicious
          sign-ins can be spotted. These cookies are needed for the site to work; we set no
          others. You can sign out of every device from your account page.
        </p>

        <h2 className={heading}>Membership</h2>
        <p className={body}>
          Payments are handled by Stripe; your card details go to Stripe and never reach us. We
          keep your Stripe customer number, your plan and the date your membership is paid until.
        </p>

        <h2 className={heading}>Bookmarks</h2>
        <p className={body}>The articles you bookmark, so you can find them again.</p>

        <h2 className={heading}>The newsletter</h2>
        <p className={body}>
          You do not need an account to get the newsletter, and having one does not sign you up.
          When you sign up we keep your email address, which form you used and when, and we
          email you a link to confirm; nothing else is sent until you click it. We then keep
          when you confirmed, and later when you unsubscribed, so we never email an address that
          asked us to stop. Every issue has a one-click unsubscribe link, and signed-in readers
          can also turn it off on their account page. Our email provider keeps a copy of the
          list in order to send it, and tells us when an address unsubscribes, bounces or marks
          an issue as spam.
        </p>

        <h2 className={heading}>Errors</h2>
        <p className={body}>
          When something breaks, we record the error so we can fix it. Email addresses, cookies
          and passwords are removed from those reports before they are stored.
        </p>

        {ADS_LIVE ? (
          <>
            <h2 className={heading}>Advertising</h2>
            <p className={body}>
              Some pages show ads from Adsterra, an ad network. Each ad runs in a sealed frame on a
              separate address, ads.questurian.com: it cannot see the page around it, your account
              or anything you type, and we tell Adsterra nothing about you. To choose and count its
              ads, Adsterra&apos;s servers see your IP address and browser and may set their own
              cookies.{' '}
              <a
                href="https://adsterra.com/privacy-policy/"
                className="text-accent underline underline-offset-2"
                rel="noopener noreferrer"
              >
                Adsterra&apos;s privacy policy
              </a>{' '}
              says what it keeps.
            </p>
            <p className={body}>
              If you are in the European Union, the wider EEA, the UK or Switzerland, we ask before
              any ad loads, and no ad loads until you answer. To find out whether to ask, our ad
              address reads the country your connection comes from; it is not stored. Your answer
              is kept in your browser only. You can change it here at any time:
            </p>
            <AdChoice />
          </>
        ) : null}

        <h2 className={heading}>Who else handles it</h2>
        <p className={body}>
          Our hosting and database providers store the data above for us, Stripe handles
          payments, Google handles Google sign-in, and our email provider delivers account mail and the newsletter.
          We do not sell your data or share it with anyone else.
        </p>

        <h2 className={heading}>Deleting your account</h2>
        <p className={body}>
          Email{' '}
          <a href={ACCOUNT_DELETION_MAILTO} className="text-accent underline underline-offset-2">
            {ACCOUNT_DELETION_EMAIL}
          </a>{' '}
          from the address you sign in with, and we delete your account within{' '}
          {ACCOUNT_DELETION_DAYS} days. We cancel any membership first, sign you out everywhere,
          and delete your account, bookmarks, newsletter subscription and sign-in details. Stripe keeps its own record of
          past payments, as the law requires of it.
        </p>
      </article>
    </main>
  );
}
