import { describe, expect, it } from 'vitest'

import { anchorArticleHeadings, headingText, slugifyHeading } from './headingAnchors'
import { serializeArticleByCollection } from './serializeArticleBlocks'

describe('slugifyHeading', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(slugifyHeading('Staying safe')).toBe('staying-safe')
    expect(slugifyHeading('Booking Lima’s destination restaurants')).toBe(
      'booking-limas-destination-restaurants',
    )
    expect(slugifyHeading('Plaza San Martín & the Cathedral')).toBe('plaza-san-martin-the-cathedral')
  })

  it('falls back to "section" when nothing usable is left', () => {
    expect(slugifyHeading('—')).toBe('section')
  })
})

describe('headingText', () => {
  it('drops inline tags and decodes entities', () => {
    expect(headingText('<strong>Eat</strong>, drink &amp; go out')).toBe('Eat, drink & go out')
  })
})

describe('anchorArticleHeadings', () => {
  it('anchors H2 and H3 in reading order and lists only the H2s', () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'text', content: '<p>Intro</p><h2>Plan the trip</h2><h3>When to go</h3>' },
      { blockType: 'image', content: '<h2>Not text</h2>' },
      { blockType: 'text', content: '<h2>Where to stay</h2><p>Body</p>' },
    ]

    const entries = anchorArticleHeadings(blocks)

    expect(entries).toEqual([
      { id: 'plan-the-trip', title: 'Plan the trip' },
      { id: 'where-to-stay', title: 'Where to stay' },
    ])
    expect(blocks[0].content).toBe(
      '<p>Intro</p><h2 id="plan-the-trip">Plan the trip</h2><h3 id="when-to-go">When to go</h3>',
    )
    expect(blocks[1].content).toBe('<h2>Not text</h2>')
  })

  it('numbers repeated titles across blocks and keeps attributes', () => {
    const blocks: Array<Record<string, unknown>> = [
      { blockType: 'text', content: '<h3>Barranco</h3>' },
      { blockType: 'text', content: '<h3 style="text-align:center">Barranco</h3><h2 id="kept">Kept</h2>' },
    ]

    const entries = anchorArticleHeadings(blocks)

    expect(blocks[0].content).toBe('<h3 id="barranco">Barranco</h3>')
    expect(blocks[1].content).toBe(
      '<h3 id="barranco-2" style="text-align:center">Barranco</h3><h2 id="kept">Kept</h2>',
    )
    expect(entries).toEqual([])
  })
})

describe('serializeArticleByCollection table of contents', () => {
  const heading = (tag: 'h2' | 'h3', text: string) => ({
    type: 'heading',
    tag,
    version: 1,
    children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }],
  })
  const lexical = (...children: unknown[]) => ({ root: { type: 'root', version: 1, children } })

  it('attaches the H2 list only when the article asks for it', async () => {
    const make = (showTableOfContents: boolean): Record<string, unknown> => ({
      showTableOfContents,
      contentBlocks: [
        { blockType: 'text', content: lexical(heading('h2', 'Eat, drink, go out'), heading('h3', 'Nights out')) },
      ],
    })

    const withContents = make(true)
    await serializeArticleByCollection('articles', withContents)
    expect(withContents.tableOfContents).toEqual([{ id: 'eat-drink-go-out', title: 'Eat, drink, go out' }])
    const [block] = withContents.contentBlocks as Array<{ content: string }>
    expect(block.content).toContain('<h3 id="nights-out">Nights out</h3>')

    const without = make(false)
    await serializeArticleByCollection('articles', without)
    expect(without).not.toHaveProperty('tableOfContents')
    const [plain] = without.contentBlocks as Array<{ content: string }>
    expect(plain.content).toContain('<h2 id="eat-drink-go-out">')
  })
})
