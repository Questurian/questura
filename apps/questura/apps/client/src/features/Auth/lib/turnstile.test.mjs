import assert from 'node:assert/strict'
import test from 'node:test'

import { post } from '../../../lib/api/api-methods.ts'
import { CAPTCHA_HEADER, captchaHeaders } from '../../../lib/api/captcha.ts'
import { CaptchaNotReadyError, createCaptchaGate, turnstileSiteKey } from './turnstile.ts'

// The email sign-in, sign-up and reset forms take a token from the gate and
// send it with `post(..., { headers: captchaHeaders(token) })`
// (`EnhancedAuthForm`, `PasswordResetModal`, `useUserQuery`). These run that
// same path into a stubbed fetch, so what reaches the server is what is
// checked. The server only asks for the header with TURNSTILE_AUTH_ENABLED.

/** `post` from the email form's side, with fetch recorded. */
async function submit(gate, body = { email: 'reader@example.com', password: 'pw' }) {
  const calls = []
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const token = await gate.take(50)
    await post('/api/visitor-auth/sign-in/email', body, { headers: captchaHeaders(token) })
  } finally {
    globalThis.fetch = realFetch
  }
  assert.equal(calls.length, 1)
  return { headers: new Headers(calls[0].init.headers), body: JSON.parse(calls[0].init.body) }
}

test('no site key: the bot check is off', () => {
  assert.equal(turnstileSiteKey(undefined), null)
  assert.equal(turnstileSiteKey(''), null)
  assert.equal(turnstileSiteKey('   '), null)
  assert.equal(createCaptchaGate(null).enabled, false)
})

test('the site key comes from NEXT_PUBLIC_TURNSTILE_SITE_KEY', () => {
  const before = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  try {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = ' 0x4AAAAAAA-site-key '
    assert.equal(turnstileSiteKey(), '0x4AAAAAAA-site-key')
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    assert.equal(turnstileSiteKey(), null)
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = before
  }
})

// Localhost and today's live build have no site key. The form must go out at
// once, with the same headers and body as before the bot check existed.
test('no site key: the form submits at once, with no captcha header', async () => {
  const gate = createCaptchaGate(null)
  // A gate that waited would reject at a zero wait; this one has nothing to wait for.
  assert.equal(await gate.take(0), null)
  const { headers, body } = await submit(gate)
  assert.equal(headers.get(CAPTCHA_HEADER), null)
  assert.equal(headers.get('content-type'), 'application/json')
  assert.deepEqual(body, { email: 'reader@example.com', password: 'pw' })
})

test('with a site key: the token is sent in x-captcha-response', async () => {
  const gate = createCaptchaGate('site-key')
  gate.accept('turnstile-token-1')
  const { headers, body } = await submit(gate)
  assert.equal(CAPTCHA_HEADER, 'x-captcha-response')
  assert.equal(headers.get('x-captcha-response'), 'turnstile-token-1')
  assert.equal(headers.get('content-type'), 'application/json')
  assert.deepEqual(body, { email: 'reader@example.com', password: 'pw' })
})

// Pressing Sign in before Cloudflare answered: the submit waits for the token.
test('with a site key: a submit waits for a token that has not arrived yet', async () => {
  const gate = createCaptchaGate('site-key')
  setTimeout(() => gate.accept('late-token'), 5)
  const { headers } = await submit(gate)
  assert.equal(headers.get(CAPTCHA_HEADER), 'late-token')
})

// Turnstile tokens are single use: a second try (mistyped password) must not
// resend the first one.
test('a token is handed out once', async () => {
  const gate = createCaptchaGate('site-key')
  gate.accept('first')
  assert.equal(await gate.take(10), 'first')
  await assert.rejects(gate.take(10), CaptchaNotReadyError)
  gate.accept('second')
  assert.equal(await gate.take(10), 'second')
})

test('an expired token is not sent', async () => {
  const gate = createCaptchaGate('site-key')
  gate.accept('stale')
  gate.expire()
  await assert.rejects(gate.take(10), CaptchaNotReadyError)
})

// The widget never loaded (blocked script, offline): the reader is told,
// and no request goes out without a token.
test('no token in time: the submit stops with a message', async () => {
  const gate = createCaptchaGate('site-key')
  await assert.rejects(gate.take(10), (error) => {
    assert.ok(error instanceof CaptchaNotReadyError)
    assert.match(error.message, /security check/)
    return true
  })
})

test('a token arriving after the wait gave up is kept for the next try', async () => {
  const gate = createCaptchaGate('site-key')
  await assert.rejects(gate.take(5), CaptchaNotReadyError)
  gate.accept('after')
  assert.equal(await gate.take(10), 'after')
})
