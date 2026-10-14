'use client';

import { useEffect, useState } from 'react';

import { rateLimitedMessage, RequestError } from '@/lib/api';
import {
  fetchAccountNewsletter,
  setAccountNewsletter,
  type AccountNewsletterStatus,
} from '@/features/newsletter/services/newsletter.service';

const DESCRIPTION: Record<AccountNewsletterStatus, string> = {
  subscribed: 'You get the Questurian newsletter once a month at your account email.',
  pending: 'Check your inbox: we sent a link to confirm your subscription.',
  'not-subscribed': 'Once a month, our newest guides, maps and itineraries, with a short note from the team.',
};

/**
 * The newsletter switch. Off until the reader turns it on: having an account
 * does not put anyone on the list.
 */
export function NewsletterSection() {
  const [status, setStatus] = useState<AccountNewsletterStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccountNewsletter()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your newsletter setting.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const on = status === 'subscribed' || status === 'pending';

  async function toggle() {
    if (status === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      setStatus(await setAccountNewsletter(!on));
    } catch (caught) {
      setError(
        rateLimitedMessage(caught) ??
          (caught instanceof RequestError && caught.status === 503 ? caught.message : 'Could not save. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-sm border border-[#d7d4ce] bg-[#f7f6f2] p-4 480:p-6 768:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id="newsletter-setting-label" className="mb-1.5 font-display text-[1rem] text-[#1A1A1A] 480:text-[1.1rem] 768:text-[1.2rem]">
            Newsletter
          </h3>
          <p className="text-[0.8rem] leading-[1.65] text-[#6b6a68] 480:text-[0.84rem]">
            {status ? DESCRIPTION[status] : 'Loading…'}
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-[0.78rem] text-[#B42318]">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="newsletter-setting-label"
          disabled={status === null || saving}
          onClick={toggle}
          className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-[#c4c2be]'}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow transition-transform ${on ? 'translate-x-5' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
