import { describe, expect, it } from 'vitest'

import { trimIntroHtml, trimIntroLexical, trimIntro } from './introSample'

const words = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `w${from + i}`).join(' ')
const countWords = (html: string) => html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length

describe('trimIntroHtml', () => {
  it('leaves an intro that already fits untouched', () => {
    const html = `<p>${words(40)}.</p><p>${words(37, 40)}.</p>`
    expect(trimIntroHtml(html, 80)).toBe(html)
  })

  it('cuts back to the last sentence end within the limit and drops later paragraphs', () => {
    const html = `<p>${words(30)}. ${words(40, 30)}. ${words(30, 70)}.</p><p>Secret second paragraph.</p>`
    const out = trimIntroHtml(html, 80)
    expect(out).toBe(`<p>${words(30)}. ${words(40, 30)}.</p>`)
    expect(out).not.toContain('Secret')
    expect(countWords(out)).toBe(70)
  })

  it('closes tags the cut leaves open', () => {
    const html = `<p>${words(50)}. <a href="#sunset"><strong>Sunset</strong> is lovely.</a> ${words(60, 50)}.</p>`
    const out = trimIntroHtml(html, 80)
    expect(out).toBe(`<p>${words(50)}. <a href="#sunset"><strong>Sunset</strong> is lovely.</a></p>`)
  })

  it('hard-cuts with an ellipsis when the opening sentence alone runs long', () => {
    const html = `<p><em>${words(120)}.</em></p>`
    const out = trimIntroHtml(html, 80)
    expect(out).toBe(`<p><em>${words(80)}…</em></p>`)
  })

  it('counts a sentence end inside closing quotes', () => {
    const html = `<p>${words(60)} “so it goes.” ${words(40, 60)}.</p>`
    expect(trimIntroHtml(html, 80)).toBe(`<p>${words(60)} “so it goes.”</p>`)
  })

  it('cuts the live rooftop intro to its first paragraph sentence ends', () => {
    const html =
      '<p>A rooftop in Lima can mean three different nights. Some are restaurants that happen to sit eighteen floors up, some are cocktail bars where you can still hear the person across the table, and a few turn into dance floors after eleven. Pick the wrong one and you get a DJ when you wanted dinner, or a quiet lounge when you came to dance. So these eighteen are grouped by what you go up for. Most are in Miraflores and San Isidro, with a few in Barranco and the old center.</p><p><a href="#sunset"><strong>Sunset</strong></a> is for eating. Insumo, 27 Tapas and The Garden look straight out over the Pacific.</p>'
    const out = trimIntroHtml(html, 80)
    expect(out.endsWith('what you go up for.</p>')).toBe(true)
    expect(out).not.toContain('Insumo')
    expect(countWords(out)).toBeLessThanOrEqual(80)
  })
})

describe('trimIntroLexical', () => {
  const text = (value: string) => ({ type: 'text', text: value })
  const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })
  const state = (...children: unknown[]) => ({ root: { type: 'root', children } })

  it('leaves a short intro as the same object', () => {
    const intro = state(paragraph(text(`${words(20)}.`)))
    expect(trimIntroLexical(intro, 80)).toBe(intro)
  })

  it('keeps whole sentences and drops later nodes without touching the original', () => {
    const intro = state(
      paragraph(text(`${words(50)}. `), { type: 'link', children: [text('Sunset spots.')] }, text(` ${words(40, 50)}.`)),
      paragraph(text('Secret second paragraph.')),
    )
    const before = JSON.stringify(intro)
    const out = trimIntroLexical(intro, 80)
    expect(JSON.stringify(intro)).toBe(before)
    expect(out).toEqual(state(paragraph(text(`${words(50)}. `), { type: 'link', children: [text('Sunset spots.')] })))
  })

  it('hard-cuts with an ellipsis inside one long sentence', () => {
    const out = trimIntroLexical(state(paragraph(text(`${words(100)}.`))), 80)
    expect(out).toEqual(state(paragraph(text(`${words(80)}…`))))
  })
})

describe('trimIntro', () => {
  it('passes through values that are neither HTML nor Lexical', () => {
    expect(trimIntro(null, 80)).toBeNull()
    expect(trimIntro(undefined, 80)).toBeUndefined()
  })
})
