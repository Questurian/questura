import assert from 'node:assert/strict'
import test from 'node:test'
import { afterCheckoutSignUpFailure, afterEmailCheck, NO_PASSWORD_NOTICE } from './checkoutSignUp.ts'

test('a new email skips the password only while buying', () => {
  assert.deepEqual(afterEmailCheck({ exists: false }, true), { step: 'checkout' })
  assert.deepEqual(afterEmailCheck({ exists: false }, false), { step: 'password', exists: false, notice: null })
})

test('an existing account always gets the password step', () => {
  for (const authMethods of [undefined, { hasPassword: true, hasGoogle: false }, { hasPassword: false, hasGoogle: true }]) {
    assert.deepEqual(afterEmailCheck({ exists: true, authMethods }, true), { step: 'password', exists: true, notice: null })
  }
})

test('not knowing is not the same as new', () => {
  for (const exists of [undefined, null, 'false', 0]) {
    assert.equal(afterEmailCheck({ exists }, true).step, 'password')
  }
})

test('an account with no way in is told about the reset link', () => {
  const next = afterEmailCheck({ exists: true, authMethods: { hasPassword: false, hasGoogle: false } }, true)
  assert.deepEqual(next, { step: 'password', exists: true, notice: NO_PASSWORD_NOTICE })
})

test('a taken address signs in, an older API signs up with a password, the rest are errors', () => {
  assert.deepEqual(afterCheckoutSignUpFailure({ status: 422 }), { exists: true })
  assert.deepEqual(afterCheckoutSignUpFailure({ status: 404 }), { exists: false })
  for (const error of [{ status: 403 }, { status: 429 }, { status: 500 }, new Error('x'), null]) {
    assert.equal(afterCheckoutSignUpFailure(error), null)
  }
})
