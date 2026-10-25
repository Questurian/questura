import assert from 'node:assert/strict'
import test from 'node:test'
import { IdentityObserver, pendingIdentity } from './identityObserver.ts'

const anonymous = { authenticated: false, principal: null }
const member = (id) => ({ authenticated: true, principal: { id, membership: { active: true } } })
const options = (read) => ({ read, retry: () => ({ retry: false }), anonymous: (error) => error.status === 401 })
const turn = () => new Promise((resolve) => setImmediate(resolve))

test('navigation consumers share one lookup and hydrate from a stable pending snapshot', async () => {
  let calls = 0
  const observer = new IdentityObserver(options(async () => { calls += 1; return member('a') }))
  const stop = observer.subscribe(() => {})
  const stopOther = observer.subscribe(() => {})
  await observer.refresh()
  assert.equal(calls, 1)
  assert.equal(observer.getSnapshot().response.principal.id, 'a')
  assert.equal(observer.getServerSnapshot(), pendingIdentity)
  stop(); stopOther()
})

test('only a confirmed anonymous answer or 401 clears the displayed reader', async () => {
  const failure = Object.assign(new Error('busy'), { status: 503 })
  const observer = new IdentityObserver(options(async () => { throw failure }))
  observer.accept(member('a'))
  await observer.refresh()
  assert.equal(observer.getSnapshot().response.principal.id, 'a')
  assert.equal(observer.getSnapshot().error, failure)
  const signedOut = new IdentityObserver(options(async () => { throw { status: 401 } }))
  await signedOut.refresh()
  assert.deepEqual(signedOut.getSnapshot().response, anonymous)
})

test('an initial service failure stays unavailable, rather than becoming anonymous', async () => {
  const observer = new IdentityObserver(options(async () => { throw { status: 403 } }))
  await observer.refresh()
  assert.equal(observer.getSnapshot().response, null)
  assert.deepEqual(observer.getSnapshot().error, { status: 403 })
})

test('a slow answer from the previous reader cannot overwrite an invalidated view', async () => {
  const resolvers = []
  const observer = new IdentityObserver(options(() => new Promise((resolve) => resolvers.push(resolve))))
  const stop = observer.subscribe(() => {})
  observer.invalidate()
  resolvers[0](member('previous'))
  await turn()
  assert.equal(observer.getSnapshot(), pendingIdentity)
  resolvers[1](member('current'))
  await observer.refresh()
  assert.equal(observer.getSnapshot().response.principal.id, 'current')
  stop()
})

test('answers fetched by account tools immediately update navigation too', () => {
  const observer = new IdentityObserver(options(async () => anonymous))
  observer.accept(member('a'))
  const cancelled = { authenticated: true, principal: { id: 'a', membership: { active: false } } }
  observer.accept(cancelled)
  assert.equal(observer.getSnapshot().response, cancelled)
})

test('transient failures retry only under the injected bounded policy', async () => {
  let calls = 0
  const observer = new IdentityObserver({
    ...options(async () => { calls += 1; if (calls < 3) throw { status: 503 }; return anonymous }),
    retry: (_error, attempt) => ({ retry: attempt < 3, delayMs: 0 }),
  })
  const stop = observer.subscribe(() => {})
  await observer.refresh()
  assert.equal(calls, 3)
  assert.deepEqual(observer.getSnapshot().response, anonymous)
  stop()
})
