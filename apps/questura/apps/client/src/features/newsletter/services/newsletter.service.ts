import { get, post, put } from '@/lib/api';

/** Which form a signup came from. Mirrors the server's `NEWSLETTER_SIGNUP_SOURCES`. */
export type NewsletterSignupSource = 'homepage-block' | 'newsletters-page' | 'article-end' | 'account';

export type NewsletterConfirmStatus = 'confirmed' | 'expired' | 'invalid';

export type AccountNewsletterStatus = 'subscribed' | 'pending' | 'not-subscribed';

/**
 * Double opt-in: the server mails a confirmation link and answers the same
 * way whether or not the address was already on the list. `website` is the
 * form's honeypot, sent as typed (empty for a person).
 */
export async function subscribeToNewsletter(input: {
  email: string;
  source: NewsletterSignupSource;
  website: string;
}): Promise<void> {
  await post('/api/newsletter/subscribe', input);
}

export async function confirmNewsletter(token: string): Promise<NewsletterConfirmStatus> {
  const { status } = await post<{ status: NewsletterConfirmStatus }>('/api/newsletter/confirm', { token });
  return status;
}

export async function fetchAccountNewsletter(): Promise<AccountNewsletterStatus> {
  const { status } = await get<{ status: AccountNewsletterStatus }>('/api/account/newsletter');
  return status;
}

export async function setAccountNewsletter(subscribed: boolean): Promise<AccountNewsletterStatus> {
  const { status } = await put<{ status: AccountNewsletterStatus }>('/api/account/newsletter', { subscribed });
  return status;
}
