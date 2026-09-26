import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.questurian.com'
})

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import HomePage from './page'

describe('API root', () => {
  it('sends the visitor to the site instead of rendering a page', () => {
    HomePage()
    expect(mocks.redirect).toHaveBeenCalledWith('https://www.questurian.com')
  })
})
