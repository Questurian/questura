import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { APIError, formatErrors } from 'payload'
import { describe, expect, it } from 'vitest'

import { restorePublicErrorMessage } from './public-error-message'

/** What the production build leaves behind: its class has no name, so neither does the error. */
function asBuiltForProduction(error: APIError): APIError {
  error.name = ''
  return error
}

const run = (error: Error, result: unknown) =>
  restorePublicErrorMessage({ error, result } as never)

describe('restorePublicErrorMessage', () => {
  it('reproduces the bug: a nameless public error is answered as unknown', () => {
    const error = asBuiltForProduction(new APIError('Item 1 needs a photo.', 400))

    expect(formatErrors(error).errors[0].message).toBe('An unknown error occurred.')
  })

  it('puts the message back on a public 400', () => {
    const error = asBuiltForProduction(new APIError('Item 1 needs a photo.', 400))

    expect(run(error, formatErrors(error))).toEqual({
      response: { errors: [{ message: 'Item 1 needs a photo.' }] },
    })
  })

  it('never reveals a 500', () => {
    const error = asBuiltForProduction(new APIError('password=hunter2 refused by db', 500))

    expect(run(error, formatErrors(new APIError('Something went wrong.')))).toBeUndefined()
    expect(run(error, { errors: [{ message: 'An unknown error occurred.' }] })).toBeUndefined()
  })

  it('never reveals a plain thrown error', () => {
    const error = new Error('connection string leaked')

    expect(run(error, { errors: [{ message: 'An unknown error occurred.' }] })).toBeUndefined()
  })

  it('leaves an answer that already carries its message alone', () => {
    const error = new APIError('Item 1 needs a photo.', 400)

    expect(run(error, formatErrors(error))).toBeUndefined()
  })

  it('is wired into the Payload config', () => {
    // Read as text: importing the config needs the whole environment.
    const source = readFileSync(resolve(__dirname, '../../payload.config.ts'), 'utf8')

    expect(source).toMatch(/afterError: \[[^\]]*restorePublicErrorMessage/)
  })
})
