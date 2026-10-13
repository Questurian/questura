import { describe, expect, it } from 'vitest'

import { parseNewsletterEmail } from './email-address'

describe('parseNewsletterEmail', () => {
  it('trims and lowercases, so one inbox is one row', () => {
    expect(parseNewsletterEmail('  Reader@Example.COM ')).toBe('reader@example.com')
  })

  it.each([undefined, null, 42, '', 'reader', 'reader@', '@example.com', 'reader@example', 'a b@example.com', 'a@b@c.com'])(
    'refuses %s',
    (value) => {
      expect(parseNewsletterEmail(value)).toBeNull()
    },
  )

  it('refuses an address longer than a mail server accepts', () => {
    expect(parseNewsletterEmail(`${'a'.repeat(250)}@example.com`)).toBeNull()
  })
})
