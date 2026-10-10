import { ValidationError } from 'payload'

/**
 * A save the editor can fix (a publish rule, a missing setup field). A plain
 * `Error` thrown from a hook becomes a 500: Payload hides the message behind
 * "Something went wrong." and the afterError hook reports it to Sentry as a
 * server fault. A `ValidationError` is a 400 that keeps the message, names
 * the field (`seoSection.metaDescription`) and is never reported.
 *
 * Payload's own top-level message would read "The following field is
 * invalid: <label>"; it is replaced with the rule's plain sentence so a client
 * that only reads `errors[0].message` still tells the editor what to fix.
 */
export function fieldRuleError({
  collection,
  path,
  label,
  message,
}: {
  collection: string
  path: string
  label: string
  message: string
}): ValidationError {
  const error = new ValidationError({ collection, errors: [{ path, label, message }] })
  error.message = message
  return error
}
