import assert from 'node:assert/strict'
import test from 'node:test'
import { isDirectArmPath, JOIN_MODE, joinDesign, previewArm } from './joinTest.ts'

test('the switch picks the design /join serves', () => {
  assert.equal(joinDesign('a'), 'A')
  assert.equal(joinDesign('b'), 'B')
  assert.equal(joinDesign(), JOIN_MODE === 'a' ? 'A' : 'B')
})

test('?show= previews either design, and nothing else', () => {
  assert.equal(previewArm('a'), 'show-a')
  assert.equal(previewArm('b'), 'show-b')
  for (const value of [null, '', 'A', 'c', 'test-a', 'show-a']) assert.equal(previewArm(value), null, String(value))
})

test('the pages /join is served from cannot be asked for by address', () => {
  for (const path of ['/join/test-a', '/join/test-b', '/join/show-a', '/join/show-b', '/join/anything']) {
    assert.equal(isDirectArmPath(path), true, path)
  }
  assert.equal(isDirectArmPath('/join'), false)
})
