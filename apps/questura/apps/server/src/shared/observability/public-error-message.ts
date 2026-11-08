import type { AfterErrorHook } from 'payload'

/**
 * Payload's answer to a plain `new APIError('…', 400)` reads "An unknown error
 * occurred." in production, while tests and `pnpm dev` show the real message.
 *
 * `formatErrors` answers an error with no `data` only if it has a `name`, and
 * `APIError` sets `name` from `this.constructor.name`. The production build
 * compiles the class to an anonymous `class extends …`, so that name is empty.
 * Subclasses (`Forbidden`, `NotFound`) keep a name and were never affected.
 *
 * So the message goes back in here, for errors Payload already treats as
 * public. A 500 has no `isPublic` and keeps its generic answer: its message can
 * hold anything, so it never leaves the server.
 */
const PAYLOAD_UNKNOWN_ERROR = 'An unknown error occurred.'

export const restorePublicErrorMessage: AfterErrorHook = ({ error, result }) => {
  if ((error as { isPublic?: unknown }).isPublic !== true) return
  if (!error.message) return

  const errors = (result as { errors?: Array<{ message?: unknown }> } | undefined)?.errors
  if (errors?.length !== 1 || errors[0]?.message !== PAYLOAD_UNKNOWN_ERROR) return

  return { response: { ...result, errors: [{ message: error.message }] } }
}
