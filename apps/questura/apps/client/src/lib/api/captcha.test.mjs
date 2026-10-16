import assert from 'node:assert/strict'
import test from 'node:test'

import { CAPTCHA_FAILED_MESSAGE, captchaFailureMessage, captchaHeaders } from './captcha.ts'
import { errorFromResponse } from './request-policy.ts'

const headers = (values = {}) => ({ get: (name) => values[name.toLowerCase()] ?? null })

// What Better Auth's captcha plugin answers (better-auth 1.6.33,
// `plugins/captcha`): a JSON body with no content-type.
const refusal = (status, message, code) =>
  errorFromResponse({ status, headers: headers() }, JSON.stringify({ message, code }))

test('a token becomes the x-captcha-response header; no token, no header', () => {
  assert.deepEqual(captchaHeaders('abc'), { 'x-captcha-response': 'abc' })
  assert.deepEqual(captchaHeaders(null), {})
  assert.deepEqual(captchaHeaders(undefined), {})
  assert.deepEqual(captchaHeaders(''), {})
})

test("the plugin's refusals read as a failed check, not a wrong password", () => {
  assert.equal(captchaFailureMessage(refusal(400, 'Missing CAPTCHA response', 'MISSING_RESPONSE')), CAPTCHA_FAILED_MESSAGE)
  assert.equal(captchaFailureMessage(refusal(403, 'Captcha verification failed', 'VERIFICATION_FAILED')), CAPTCHA_FAILED_MESSAGE)
})

test('other failures are left to their own handling', () => {
  assert.equal(captchaFailureMessage(refusal(401, 'Invalid email or password', 'INVALID_EMAIL_OR_PASSWORD')), null)
  // Siteverify unreachable: the plugin's 500, an outage, not the reader's fault.
  assert.equal(captchaFailureMessage(refusal(500, 'Something went wrong', 'UNKNOWN_ERROR')), null)
  // The same words on another status are not the plugin.
  assert.equal(captchaFailureMessage(refusal(422, 'Captcha verification failed', 'X')), null)
  assert.equal(captchaFailureMessage(new Error('Captcha verification failed')), null)
  assert.equal(captchaFailureMessage('Captcha verification failed'), null)
})
