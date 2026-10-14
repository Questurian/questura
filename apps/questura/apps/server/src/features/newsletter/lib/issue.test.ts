import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/payload.config', () => ({ default: {} }))

type IssueModule = typeof import('./issue')
let issue: IssueModule

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.questurian.com')
  vi.resetModules()
  issue = await import('./issue')
})

const item = {
  type: 'maps' as const,
  id: 23,
  title: 'The Best Chifa <Restaurants> in Lima',
  slug: 'best-chifa',
  excerpt: 'Fried rice & noodles.',
  publishedAt: '2026-10-12T22:40:38.803Z',
  href: '/peru/lima/maps/best-chifa',
  thumbnail: { url: 'https://questurian-cdn.b-cdn.net/media/chifa.webp', alt: 'A plate of chaufa' },
}

describe('parseIssueDraft', () => {
  it('keeps a valid draft', () => {
    expect(issue.parseIssueDraft({ subject: ' October ', note: 'Hi', items: [{ type: 'maps', id: '23' }] })).toEqual({
      subject: 'October',
      note: 'Hi',
      items: [{ type: 'maps', id: 23 }],
    })
  })

  it.each([
    [{ subject: '', items: [{ type: 'maps', id: 1 }] }],
    [{ subject: 'x'.repeat(151), items: [{ type: 'maps', id: 1 }] }],
    [{ subject: 'ok', items: [] }],
    [{ subject: 'ok', items: [{ type: 'users', id: 1 }] }],
    [{ subject: 'ok', items: [{ type: 'maps', id: -1 }] }],
    [{ subject: 'ok', note: 'x'.repeat(5001), items: [{ type: 'maps', id: 1 }] }],
  ])('refuses %j', (body) => {
    expect('error' in issue.parseIssueDraft(body)).toBe(true)
  })
})

describe('renderIssue', () => {
  const render = (unsubscribeUrl: string) =>
    issue.renderIssue({ subject: 'October in Lima', note: 'Hello <b>readers</b>.\n\nSecond paragraph.' }, [item], {
      unsubscribeUrl,
      postalAddress: 'PO Box 1, Lima',
      now: new Date('2026-10-31T23:30:00Z'),
    })

  it('links each piece absolutely on the site and escapes everything typed', () => {
    const { html } = render('https://www.questurian.com/account')

    expect(html).toContain('href="https://www.questurian.com/peru/lima/maps/best-chifa"')
    expect(html).toContain('The Best Chifa &lt;Restaurants&gt; in Lima')
    expect(html).toContain('Hello &lt;b&gt;readers&lt;/b&gt;.')
    expect(html).not.toContain('<b>readers</b>')
    expect(html).toContain('October 2026')
  })

  it("keeps Resend's unsubscribe placeholder intact in both parts, and prints the postal address", () => {
    const { html, text } = render(issue.RESEND_UNSUBSCRIBE_PLACEHOLDER)

    expect(html).toContain('href="{{{RESEND_UNSUBSCRIBE_URL}}}"')
    expect(text).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(html).toContain('PO Box 1, Lima')
    expect(text).toContain('PO Box 1, Lima')
  })

  it('has a plain-text part with the links', () => {
    const { text } = render(issue.RESEND_UNSUBSCRIBE_PLACEHOLDER)

    expect(text).toContain('https://www.questurian.com/peru/lima/maps/best-chifa')
    expect(text).toContain('Second paragraph.')
    expect(text).toContain('Read it →')
    // The only angle brackets left are the ones the note and title were typed with.
    expect(text.replace('<b>readers</b>', '').replace('<Restaurants>', '')).not.toMatch(/<[a-z!/]/i)
    expect(text).not.toMatch(/&[a-z]+;/)
  })
})
