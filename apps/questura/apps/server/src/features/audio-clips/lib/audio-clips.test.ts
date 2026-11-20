import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { anchorArticleHeadings } from '@/features/articles/public/headingAnchors'

import { coveredSeconds, mergeRanges, normalizeRanges } from './listens'
import { articleReading, bylineSentence, clipMatchesSection, sectionsFromBlocks, splitSentences } from './sections'
import { audioStorageKey, signAudioUrl } from './storage'

const lima = [
  {
    blockType: 'text',
    content:
      '<p>Lima is a city to plan around its meals. Two of the last three restaurants named the best in the world cook here, Central in 2023 and Maido in 2025.</p>' +
      '<p>Ceviche is a lunch dish, served for about S/ 20. Most visitors give Lima one night.</p>' +
      '<h2>Plan the trip</h2><h3>When to go</h3><p>Lima’s seasons run opposite to those of the Andes.</p>',
  },
  { blockType: 'image', image: { url: 'x' } },
  {
    blockType: 'text',
    content: '<ul><li>Bring a light jacket</li><li>Book Central ahead</li></ul><h2>Where to stay</h2><p>Miraflores is easiest.</p>',
  },
]

function anchored() {
  const blocks = structuredClone(lima) as Array<Record<string, unknown>>
  anchorArticleHeadings(blocks)
  return blocks
}

describe('splitSentences', () => {
  it('splits at a full stop before a capital and keeps prices whole', () => {
    expect(splitSentences('Ceviche is a lunch dish, served for about S/ 20. Most visitors give Lima one night.')).toEqual([
      'Ceviche is a lunch dish, served for about S/ 20.',
      'Most visitors give Lima one night.',
    ])
  })
  it('keeps a run without punctuation as one sentence', () => {
    expect(splitSentences('Bring a light jacket')).toEqual(['Bring a light jacket'])
  })
})

describe('sectionsFromBlocks', () => {
  it('reads the Intro, then each H2 section with its heading, sub-headings, paragraphs and list items', () => {
    const sections = sectionsFromBlocks(anchored())
    expect(sections.map((section) => section.key)).toEqual(['intro', 'plan-the-trip', 'where-to-stay'])
    expect(sections[0].sentences).toEqual([
      'Lima is a city to plan around its meals.',
      'Two of the last three restaurants named the best in the world cook here, Central in 2023 and Maido in 2025.',
      'Ceviche is a lunch dish, served for about S/ 20.',
      'Most visitors give Lima one night.',
    ])
    expect(sections[1].sentences).toEqual([
      'Plan the trip.',
      'When to go.',
      'Lima’s seasons run opposite to those of the Andes.',
      'Bring a light jacket',
      'Book Central ahead',
    ])
    expect(sections[2].title).toBe('Where to stay')
  })

  it('has no Intro when the article opens with a heading', () => {
    const blocks = [{ blockType: 'text', content: '<h2>Plan</h2><p>Go in May.</p>' }] as Array<Record<string, unknown>>
    anchorArticleHeadings(blocks)
    expect(sectionsFromBlocks(blocks).map((section) => section.key)).toEqual(['plan'])
  })
})

describe('articleReading', () => {
  it('reads the title, the byline, the dek, then the whole body as one "article" section', () => {
    const reading = articleReading({
      title: 'The Questurian Guide to Lima',
      authors: ['Alan Malpartida'],
      dek: 'Where to eat, stay and walk. Updated for 2026.',
      blocks: anchored(),
    })
    expect(reading.key).toBe('article')
    expect(reading.sentences.slice(0, 5)).toEqual([
      'The Questurian Guide to Lima.',
      'By Alan Malpartida.',
      'Where to eat, stay and walk.',
      'Updated for 2026.',
      'Lima is a city to plan around its meals.',
    ])
    expect(reading.sentences).toContain('Plan the trip.')
    expect(reading.sentences.at(-1)).toBe('Miraflores is easiest.')
  })

  it('names every author, and skips a missing byline or dek', () => {
    expect(bylineSentence(['Ana', 'Ben', 'Cy'])).toBe('By Ana, Ben and Cy.')
    expect(bylineSentence(['Ana', 'Ben'])).toBe('By Ana and Ben.')
    expect(bylineSentence([' '])).toBeNull()
    const reading = articleReading({ title: 'Lima?', authors: [], dek: null, blocks: [] })
    expect(reading.sentences).toEqual(['Lima?'])
  })
})

describe('clipMatchesSection', () => {
  const section = ['One.', 'Two.', 'Three.']
  it('accepts a clip that reads the start of its section', () => {
    expect(clipMatchesSection(['One.', 'Two.'], section)).toBe(true)
    expect(clipMatchesSection(section, section)).toBe(true)
  })
  it('flags a clip whose words changed', () => {
    expect(clipMatchesSection(['One.', 'Too.'], section)).toBe(false)
    expect(clipMatchesSection(['One.', 'Two.', 'Three.', 'Four.'], section)).toBe(false)
    expect(clipMatchesSection([], section)).toBe(false)
  })
})

describe('Listen ranges', () => {
  it('merges touching stretches and clamps to the clip', () => {
    expect(normalizeRanges([[10, 20], [0, 5], [19.9, 30], [55, 80]], 60)).toEqual([
      [0, 5],
      [10, 30],
      [55, 60],
    ])
    expect(coveredSeconds(mergeRanges([[0, 5], [10, 30]]))).toBe(25)
  })
  it('refuses a malformed report', () => {
    expect(normalizeRanges('nope', 60)).toBeNull()
    expect(normalizeRanges([[1, 'x']], 60)).toBeNull()
  })
})

describe('signed audio links', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
  })

  it("signs Bunny's basic token over the path and expiry", () => {
    process.env.BUNNY_AUDIO_STORAGE_ZONE_NAME = 'questurian-audio'
    process.env.BUNNY_AUDIO_STORAGE_HOSTNAME = 'storage.bunnycdn.com'
    process.env.BUNNY_AUDIO_STORAGE_API_KEY = 'storage-key'
    process.env.BUNNY_AUDIO_PULL_ZONE_HOST = 'https://questurian-audio.b-cdn.net/'
    process.env.BUNNY_AUDIO_TOKEN_KEY = 'token-key'

    const { url, expiresAt } = signAudioUrl('live/articles/54/intro-1.mp3', 900, 1_000_000)
    expect(expiresAt).toBe(1_000_900)
    const expected = createHash('sha256')
      .update('token-key/live/articles/54/intro-1.mp31000900')
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
    expect(url).toBe(`https://questurian-audio.b-cdn.net/live/articles/54/intro-1.mp3?token=${expected}&expires=1000900`)
  })

  it('names files per environment, article and section, new each time', () => {
    expect(audioStorageKey(54, 'plan-the-trip', 123)).toMatch(/^(live|local)\/articles\/54\/plan-the-trip-123\.mp3$/)
  })
})
