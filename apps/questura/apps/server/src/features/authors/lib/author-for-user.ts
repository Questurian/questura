import { APIError, type PayloadRequest } from 'payload'

import { staffUser } from '@/features/auth/lib/staff-user'

/**
 * Resolves the Author record that a staff account writes as (ADR-0007).
 *
 * Bylines point at `authors`, but everything that creates or scopes an article
 * knows only the logged-in `users` row, so this is the one place that crosses
 * between them. Keeping it in one place is deliberate: a second, slightly
 * different translation is how the two ids drift apart.
 */
export async function findAuthorIdForUser(
  req: PayloadRequest,
  userId: number | string,
): Promise<number | null> {
  const match = await req.payload.find({
    collection: 'authors',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const author = match.docs[0]
  return author ? (author.id as number) : null
}

/**
 * As above, but creates the Author record when the account has none.
 *
 * Used on article creation, where the byline is required: a new hire who has
 * never published has no author record yet, and refusing their first article
 * would be a worse failure than minting the record they are about to need. The
 * slug is left to `authorSlugHook`.
 */
export async function ensureAuthorIdForUser(
  req: PayloadRequest,
  userId: number | string,
): Promise<number | null> {
  const existing = await findAuthorIdForUser(req, userId)
  if (existing !== null) return existing

  const user = await req.payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    overrideAccess: true,
  })
  if (!user) return null

  // The account holds no authorship to copy across (ADR-0007), so the record
  // starts from the person's name and they fill in the rest.
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email

  const created = await req.payload.create({
    collection: 'authors',
    data: {
      user: user.id,
      displayName,
    },
    overrideAccess: true,
    req,
  })

  return created.id as number
}

function requestedAuthorId(requested: unknown): number | string | null {
  if (typeof requested === 'number' || (typeof requested === 'string' && requested !== '')) {
    return requested
  }
  if (requested && typeof requested === 'object' && 'id' in requested) {
    return requestedAuthorId((requested as { id: unknown }).id)
  }
  return null
}

/**
 * The byline for a new item.
 *
 * An admin or editor may name the Author up front -- the same roles the
 * `author` field lets change a byline later -- so a tool that signs in with
 * one account (the studio) can publish under the real writer's name instead
 * of its own. Everyone else, and anyone who names nobody, gets their own
 * Author record, as before. A named Author that does not exist is refused
 * rather than quietly replaced by the caller.
 */
export async function bylineOnCreate(
  req: PayloadRequest,
  requested: unknown,
): Promise<number | null> {
  const user = staffUser(req.user)
  if (!user) return null

  const wanted = requestedAuthorId(requested)
  const mayChoose = user.role === 'admin' || user.role === 'editor'
  if (wanted === null || !mayChoose) return ensureAuthorIdForUser(req, user.id)

  const found = await req.payload.find({
    collection: 'authors',
    where: { id: { equals: wanted } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const author = found.docs[0]
  if (!author) throw new APIError(`Author ${String(wanted)} does not exist.`, 400, undefined, true)
  return author.id as number
}
