import { normalizeEmail } from '@/shared/lib/normalize-email'

// Deliberately loose: one `@`, no whitespace, a dot in the domain. The
// confirmation email is the real check; this only stops obvious junk from
// costing a send.
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** RFC 5321's limit on a forward path. */
const MAX_LENGTH = 254

/** The normalized address, or `null` when it cannot be one. */
export function parseNewsletterEmail(value: unknown): string | null {
  const email = normalizeEmail(value)
  if (!email || email.length > MAX_LENGTH || !SHAPE.test(email)) return null
  return email
}
