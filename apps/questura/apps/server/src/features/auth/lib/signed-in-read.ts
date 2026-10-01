import type { Access } from 'payload'

/**
 * Read access for a collection or global that only signed-in callers need:
 * any staff user or service account, never an anonymous one.
 *
 * Payload's own REST and GraphQL mounts are public on `api.questurian.com`,
 * and a collection's `read` rule is the only gate there. The website never
 * reads through them: every page reads `/api/public/*`, whose routes query
 * with the Local API (`overrideAccess` defaults to true) and decide at
 * serialization time what a reader may see (ADR-0009). So an anonymous read
 * on a raw collection served nobody but scrapers -- the whole media catalog,
 * storage keys and uploader ids included.
 *
 * Every signed-in caller keeps exactly the access it had when this rule was
 * `() => true`: the admin, the writer app and Location Manager authenticate.
 */
export const signedInRead: Access = ({ req }) => Boolean(req.user)
