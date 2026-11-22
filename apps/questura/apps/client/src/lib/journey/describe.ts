/**
 * The words a journey keeps (ADR-0019). Never anything a reader typed, and
 * never a reader's own details shown back to them.
 */

/**
 * Pages that show a reader their own details or words (the account, sign-in,
 * the search page, which prints what was typed): their path and time only.
 */
export function isOwnDetailsPage(path: string): boolean {
  return /^\/(account|subscription|auth|search|newsletters\/confirm)([/-]|$)/.test(path)
}

/** Not reading: staff previews. */
export function isRecordedPath(path: string): boolean {
  return !path.startsWith('/studio-preview')
}

/*
 * Outside the page's own content (the navbar, menus, the sign-in box) a label
 * can be the reader's name, so only these are kept by name.
 */
const CHROME_LABELS = new Set([
  'Subscribe', 'Sign in', 'Membership', 'Continue', 'Continue with Google', 'Create account',
  'List', 'Split', 'Map', 'Open menu', 'Close', 'Become a member', 'Become a member to unlock',
])

export function tapLabel(text: string, inContent: boolean): string {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 80)
  if (inContent) return clean && !clean.includes('@') ? clean : 'A button'
  if (/^(Subscribe|Join: \$)/i.test(clean)) return 'Subscribe'
  for (const label of CHROME_LABELS) {
    if (label.toLowerCase() === clean.toLowerCase()) return label
  }
  return 'Site menu'
}

export function fieldLabel(type: string): string | null {
  if (type === 'email') return 'Email box'
  if (type === 'password') return 'Password box'
  if (type === 'search') return 'Search box'
  if (type === 'text' || type === 'textarea') return 'A text box'
  return null
}

/** Null: opened from the studio, so not a reader. */
export function sourceOf(referrer: string, userAgent: string, ownHost: string): string | null {
  let host = ''
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    // No referrer.
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`)
  // The word only: the deploy's bundle scan refuses a loopback address in browser code.
  if (host === 'localhost') return ownHost === host ? 'Direct' : null
  if (is('instagram.com') || /Instagram/.test(userAgent)) return 'Instagram'
  if (is('facebook.com') || is('fb.com') || /FBAN|FBAV/.test(userAgent)) return 'Facebook'
  if (!host || host === ownHost || is('questurian.com')) return 'Direct'
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'Google'
  return host.slice(0, 80)
}

/** A link tag such as `?utm_campaign=rooftop-reel`; short slugs only. */
export function campaignOf(search: string): string | null {
  const params = new URLSearchParams(search)
  const value = params.get('utm_campaign') ?? params.get('utm_content') ?? ''
  return /^[\w-]{1,60}$/.test(value) ? value : null
}
