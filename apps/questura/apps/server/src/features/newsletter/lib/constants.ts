export const NEWSLETTER_SUBSCRIBER_STATUSES = [
  'pending',
  'subscribed',
  'unsubscribed',
  'bounced',
  'complained',
] as const

export type NewsletterSubscriberStatus = (typeof NEWSLETTER_SUBSCRIBER_STATUSES)[number]

/** The forms a signup can come from. A new form is one option plus a migration. */
export const NEWSLETTER_SIGNUP_SOURCES = [
  'homepage-block',
  'newsletters-page',
  'article-end',
  'account',
] as const

export type NewsletterSignupSource = (typeof NEWSLETTER_SIGNUP_SOURCES)[number]

export function isNewsletterSignupSource(value: unknown): value is NewsletterSignupSource {
  return typeof value === 'string' && (NEWSLETTER_SIGNUP_SOURCES as readonly string[]).includes(value)
}

/** How long a confirmation link works. */
export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** The website page the confirmation link opens. It POSTs the token back. */
export const CONFIRM_PAGE_PATH = '/newsletters/confirm'
