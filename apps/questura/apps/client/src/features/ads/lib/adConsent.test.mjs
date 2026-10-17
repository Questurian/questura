import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AD_CONSENT_KEY,
  AD_CONSENT_SCRIPT,
  AD_REGION_KEY,
  adsMayLoad,
  consentRequiredFor,
  createAdConsentStore,
} from './adConsent.ts'

const memory = () => {
  const map = new Map()
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

const settle = () => new Promise((r) => setTimeout(r, 0))

function store({ required = false, fails = false, local = memory(), session = memory() } = {}) {
  const marks = []
  let calls = 0
  const s = createAdConsentStore({
    local,
    session,
    fetchConsentRequired: async () => {
      calls += 1
      if (fails) throw new Error('offline')
      return required
    },
    markDocument: (c) => marks.push(c),
  })
  return { s, local, session, marks, calls: () => calls }
}

test('countries that must be asked', () => {
  assert.equal(consentRequiredFor('FR'), true)
  assert.equal(consentRequiredFor('gb'), true)
  assert.equal(consentRequiredFor('US'), false)
  assert.equal(consentRequiredFor('PE'), false)
  // Unknown or anonymised: ask.
  assert.equal(consentRequiredFor(null), true)
  assert.equal(consentRequiredFor('XX'), true)
  assert.equal(consentRequiredFor('T1'), true)
})

test('outside the consent countries ads load with nothing to answer', async () => {
  const { s, session } = store({ required: false })
  s.subscribe(() => {})
  assert.equal(s.getSnapshot(), 'pending')
  await settle()
  assert.equal(s.getSnapshot(), 'not-required')
  assert.equal(adsMayLoad(s.getSnapshot()), true)
  assert.equal(session.getItem(AD_REGION_KEY), 'not-required')
})

test('inside them nothing loads until the visitor says yes', async () => {
  const { s, local, marks } = store({ required: true })
  s.subscribe(() => {})
  await settle()
  assert.equal(s.getSnapshot(), 'ask')
  assert.equal(adsMayLoad('ask'), false)
  s.choose('granted')
  assert.equal(s.getSnapshot(), 'granted')
  assert.equal(local.getItem(AD_CONSENT_KEY), 'granted')
  assert.deepEqual(marks, ['granted'])
})

test('no thanks is remembered and never asks again', async () => {
  const local = memory()
  const first = store({ required: true, local })
  first.s.subscribe(() => {})
  await settle()
  first.s.choose('denied')
  const next = store({ required: true, local })
  next.s.subscribe(() => {})
  await settle()
  assert.equal(next.s.getSnapshot(), 'denied')
  assert.equal(next.calls(), 0, 'a stored answer needs no region check')
})

test('the region answer is reused for the session', async () => {
  const session = memory()
  session.setItem(AD_REGION_KEY, 'required')
  const { s, calls } = store({ required: false, session })
  s.subscribe(() => {})
  await settle()
  assert.equal(s.getSnapshot(), 'ask')
  assert.equal(calls(), 0)
})

test('a failed region check asks rather than loading ads', async () => {
  const { s } = store({ fails: true })
  s.subscribe(() => {})
  await settle()
  assert.equal(s.getSnapshot(), 'ask')
})

test('changing your mind on the privacy page asks again', async () => {
  const { s, local, marks } = store({ required: false })
  s.subscribe(() => {})
  await settle()
  s.choose('denied')
  s.reset()
  assert.equal(s.getSnapshot(), 'ask')
  assert.equal(local.getItem(AD_CONSENT_KEY), null)
  assert.deepEqual(marks, ['denied', null])
})

test('the pre-paint script marks only a stored no', () => {
  assert.match(AD_CONSENT_SCRIPT, /localStorage\.getItem\("qv-ad-consent"\)==="denied"/)
  assert.match(AD_CONSENT_SCRIPT, /dataset\.adConsent="denied"/)
})
