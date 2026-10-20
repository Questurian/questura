import assert from 'node:assert/strict'
import test from 'node:test'
import { headingMatch, pairStayBoxes, withoutListNumber } from './stayBoxes.ts'

const text = (id, content) => ({ id, blockType: 'text', content })
const card = (id, title) => ({ id, blockType: 'airbnb-card', airbnb: { title } })
const section = (heading, body = `<p>About ${heading}.</p>`, tag = 'h2') => `<${tag}>${heading}</${tag}>${body}`

const STAYS = ['The two bedroom on Malecón de la Marina', 'A loft by Kennedy Park', 'Clifftop duplex penthouse']

test('a list article: each card takes in the section above it, which leaves the column', () => {
  const blocks = [
    text('intro', '<p>These stays all came in under US$150 a night.</p>'),
    ...STAYS.flatMap((title, i) => [text(`s${i}`, section(title)), card(`c${i}`, title)]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => block.id),
    ['intro', 'c0', 'c1', 'c2'],
  )
  assert.deepEqual(paired[1].lead, {
    headingHtml: 'The two bedroom on Malecón de la Marina',
    level: 2,
    html: '<p>About The two bedroom on Malecón de la Marina.</p>',
    namesStay: true,
  })
  assert.deepEqual(
    paired.slice(1).map((block) => block.position),
    [
      { index: 1, total: 3 },
      { index: 2, total: 3 },
      { index: 3, total: 3 },
    ],
  )
  // The input is left alone: the server render and the member swap both pair their own copy.
  assert.equal(blocks.length, 7)
  assert.equal(blocks[2].lead, undefined)
})

test('in a list, a heading that does not name the stay is still that stay’s write-up', () => {
  const blocks = [
    text('s0', section('Best for ocean views')),
    card('c0', 'Clifftop duplex penthouse'),
    text('s1', section('Best for a long stay')),
    card('c1', 'A loft by Kennedy Park'),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => [block.id, block.lead?.headingHtml, block.lead?.namesStay]),
    [
      ['c0', 'Best for ocean views', false],
      ['c1', 'Best for a long stay', false],
    ],
  )
})

test('only the last section of the block above is taken; what came before it stays as prose', () => {
  const blocks = [
    text('s0', `<p>Opening paragraph.</p>${section('Why Miraflores')}${section(STAYS[0])}`),
    card('c0', STAYS[0]),
    text('s1', section(STAYS[1])),
    card('c1', STAYS[1]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.equal(paired[0].id, 's0')
  assert.equal(paired[0].content, `<p>Opening paragraph.</p>${section('Why Miraflores')}`)
  assert.equal(paired[1].lead.headingHtml, STAYS[0])
})

test('an h3 inside a stay’s section stays inside its write-up', () => {
  const body = '<p>Bright and quiet.</p><h3>Good to know</h3><p>No lift.</p>'
  const blocks = [text('s0', section(STAYS[0], body)), card('c0', STAYS[0]), text('s1', section(STAYS[1])), card('c1', STAYS[1])]

  const paired = pairStayBoxes(blocks)

  assert.equal(paired[0].lead.headingHtml, STAYS[0])
  assert.equal(paired[0].lead.html, body)
})

test('a stay written under an h3 keeps its level', () => {
  const blocks = [
    text('s0', section(STAYS[0], '<p>One.</p>', 'h3')),
    card('c0', STAYS[0]),
    text('s1', section(STAYS[1], '<p>Two.</p>', 'h3')),
    card('c1', STAYS[1]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => block.lead.level),
    [3, 3],
  )
})

test('cards moved above their sections are matched by name to the section below', () => {
  const blocks = [
    text('intro', `<p>Intro.</p>`),
    ...STAYS.flatMap((title, i) => [card(`c${i}`, title), text(`s${i}`, section(title))]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => [block.id, block.lead?.headingHtml ?? null]),
    [
      ['intro', null],
      ['c0', STAYS[0]],
      ['c1', STAYS[1]],
      ['c2', STAYS[2]],
    ],
  )
})

test('when names do not settle it, the side with a section for more cards wins', () => {
  // Cards above their sections, headings that name nothing: below has a
  // section for all three cards, above only for the last two.
  const blocks = [
    text('intro', '<p>Intro.</p>'),
    card('c0', 'Clifftop duplex penthouse'),
    text('s0', section('Best for ocean views')),
    card('c1', 'A loft by Kennedy Park'),
    text('s1', section('Best for a long stay')),
    card('c2', 'Garden studio'),
    text('s2', section('Best on a budget')),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => block.lead?.headingHtml ?? block.id),
    ['intro', 'Best for ocean views', 'Best for a long stay', 'Best on a budget'],
  )
})

test('a lone Airbnb in a wider article only takes a section that names it', () => {
  const general = [text('s0', section('Where to stay', '<p>Miraflores is the easy base.</p>')), card('c0', STAYS[2])]
  const named = [text('s0', section('Clifftop Duplex Penthouse', '<p>Wall to wall windows.</p>')), card('c0', STAYS[2])]

  const untouched = pairStayBoxes(general)
  const boxed = pairStayBoxes(named)

  assert.deepEqual(
    untouched.map((block) => block.id),
    ['s0', 'c0'],
  )
  assert.equal(untouched[1].lead, null)
  assert.equal(untouched[1].position, null)
  assert.deepEqual(
    boxed.map((block) => block.id),
    ['c0'],
  )
  assert.equal(boxed[0].lead.html, '<p>Wall to wall windows.</p>')
})

test('a hidden Airbnb leaves its section in the column and is not numbered', () => {
  const blocks = [
    text('s0', section(STAYS[0])),
    { id: 'c0', blockType: 'airbnb-card', airbnb: null },
    text('s1', section(STAYS[1])),
    card('c1', STAYS[1]),
    text('s2', section(STAYS[2])),
    card('c2', STAYS[2]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => block.id),
    ['s0', 'c0', 'c1', 'c2'],
  )
  assert.deepEqual(paired[2].position, { index: 1, total: 2 })
})

test('a card with no text beside it, or with an image between, takes nothing', () => {
  const blocks = [
    text('s0', section(STAYS[0])),
    { id: 'img', blockType: 'image' },
    card('c0', STAYS[0]),
    card('c1', STAYS[1]),
  ]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => block.id),
    ['s0', 'img', 'c0', 'c1'],
  )
  assert.equal(paired[2].lead, null)
  assert.equal(paired[3].lead, null)
})

test('a card right after another card takes nothing, and other blocks pass through as they were', () => {
  const faq = { id: 'faq', blockType: 'faq', items: [] }
  const blocks = [text('s0', section(STAYS[0])), card('c0', STAYS[0]), card('c1', STAYS[0]), faq]

  const paired = pairStayBoxes(blocks)

  assert.deepEqual(
    paired.map((block) => [block.id, Boolean(block.lead)]),
    [
      ['c0', true],
      ['c1', false],
      ['faq', false],
    ],
  )
  assert.equal(paired[2], faq)
})

test('an article without Airbnbs comes back as the same list', () => {
  const blocks = [text('s0', section('Anything'))]

  assert.equal(pairStayBoxes(blocks), blocks)
})

test('headingMatch ignores accents, case, numbering and small words', () => {
  assert.equal(headingMatch('1. The Two-Bedroom on <em>Malecón</em> de la Marina', 'Two bedroom on Malecon de la Marina'), 1)
  assert.equal(headingMatch('Where to stay', 'Clifftop duplex penthouse'), 0)
  assert.equal(headingMatch('', 'Anything'), 0)
})

test('withoutListNumber drops the writer’s list number and nothing else', () => {
  assert.equal(withoutListNumber('1. The Two-Bedroom'), 'The Two-Bedroom')
  assert.equal(withoutListNumber('<strong>10) Loft</strong>'), '<strong>Loft</strong>')
  assert.equal(withoutListNumber('4: Best for a long stay'), 'Best for a long stay')
  assert.equal(withoutListNumber('1950s Flat by the Sea'), '1950s Flat by the Sea')
  assert.equal(withoutListNumber('No. 1 Loft'), 'No. 1 Loft')
})
