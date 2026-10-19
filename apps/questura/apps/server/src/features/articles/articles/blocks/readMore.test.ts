import { describe, expect, it } from 'vitest'
import { isReadMoreUrl } from './readMore'

describe('Read more destination contract', () => {
  it.each(['/peru/lima', 'https://www.questurian.com/peru/lima?x=1#food', 'http://localhost:3000/lima'])('accepts %s', (url) => {
    expect(isReadMoreUrl(url)).toBe(true)
  })
  it.each(['', 'javascript:alert(1)', 'data:text/html,hi', '//evil.test', '/\\evil.test', '/has space', 'https://', 'https://user:pass@example.com', 'https://x.test/\tpath'])('refuses %j', (url) => {
    expect(isReadMoreUrl(url)).toBe(false)
  })
})
