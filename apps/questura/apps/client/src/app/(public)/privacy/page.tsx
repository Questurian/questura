import type { Metadata } from 'next';

import { JourneyChoice } from '@/features/privacy/JourneyChoice';
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
 * "How the site is used" describes reader journeys (docs/adr/0019); a new
 * thing recorded there means a new line here in the same deploy.
 *
 * No ad network runs on the site (features/ads/lib/adUnits.ts). Wiring one in
 * means rewriting the opening line and adding an Advertising section in the
 * same deploy, and bumping "Last updated".
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
        <p className="text-[0.85rem] text-foreground/60 mt-2">Last updated 22 November 2026</p>

        <p className={`${body} mt-6`}>
          You can read Questurian without an account. We do not run advertising and we do not sell
          your data. For readers in the United States we record how the site is used, which you can
          turn off below. This page lists what we keep, and why.
        </p>

        <h2 className={heading}>How the site is used</h2>
        <p className={body}>
          If you are in the United States, we record the pages you open, how long they are on
          screen, how far you scroll, the sections you see, taps on our links, buttons and maps,
          which boxes you select (never what you type), and whether you reach prices or checkout.
          With that we keep your approximate city and state, worked out from your connection, your
          type of device and browser, your language, and the site or link you came from. We do not
          store your IP address with it and we do not record your screen. We use it to learn where
          readers get stuck and to make the site and membership better.
        </p>
        <p className={body}>
          A random ID saved in your browser links your visits. If you sign in or create an account
          on that browser, we link those visits, including earlier ones, to your account, so we can
          see them with your email address. We delete each page view after 90 days; backup copies
          can last up to 30 days longer.
        </p>
        <p className={body}>
          We record nothing when your browser sends Global Privacy Control or Do Not Track. You can
          also turn recording off here, which deletes what is linked to this browser:
        </p>
        <JourneyChoice />
        <p className={body}>
          Separately, our host Cloudflare counts page views for readers in every country, without
          cookies and without giving anyone a profile.
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
          others (the random ID above is kept in browser storage, which is not a cookie). You can sign out of every device from your account page.
        </p>

        <h2 className={heading}>Membership</h2>
        <p className={body}>
          Payments are handled by Stripe; your card details go to Stripe and never reach us. We
          keep your Stripe customer number, your plan and the date your membership is paid until.
        </p>

        <h2 className={heading}>Bookmarks</h2>
        <p className={body}>The articles you bookmark, so you can find them again.</p>

        <h2 className={heading}>Listening</h2>
        <p className={body}>
          When you play a guide&rsquo;s audio, we record which section you played, when, how long you
          listened, which parts you heard and at what speed. We use it to learn which guides people
          listen to and where they stop, so we can make them better.
        </p>

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
          and delete your account, bookmarks, listening history, linked reading records, newsletter subscription and sign-in details. Stripe keeps its own record of
          past payments, as the law requires of it.
        </p>
      </article>
    </main>
  );
}
