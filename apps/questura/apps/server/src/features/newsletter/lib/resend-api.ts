/**
 * The handful of Resend REST calls the newsletter makes, with the newsletter's
 * own full-access key (`config.ts`). Plain `fetch`, no SDK: four endpoints do
 * not earn a dependency.
 */

const BASE = 'https://api.resend.com'
const TIMEOUT_MS = 15_000

export class ResendApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    path: string,
  ) {
    super(`Resend ${path} answered ${status}: ${body.slice(0, 300)}`)
    this.name = 'ResendApiError'
  }
}

async function call<T>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) throw new ResendApiError(response.status, text, `${method} ${path.split('?')[0]}`)
  return (text ? JSON.parse(text) : {}) as T
}

export type ResendContact = {
  id: string
  email: string
  unsubscribed: boolean
  created_at?: string
  updated_at?: string
}

type List<T> = { data: T[]; has_more: boolean }

const enc = encodeURIComponent

/**
 * Makes `email` a contact in `segmentId` with the given subscription state.
 *
 * Contacts are global in Resend and segments are memberships, so an address
 * that already exists (an earlier signup, a contact made by hand) is updated
 * and then added to the segment rather than created twice.
 */
export async function upsertContact(
  apiKey: string,
  segmentId: string,
  email: string,
  unsubscribed: boolean,
): Promise<void> {
  try {
    await call(apiKey, 'PATCH', `/contacts/${enc(email)}`, { unsubscribed })
  } catch (error) {
    if (!(error instanceof ResendApiError && error.status === 404)) throw error
    await call(apiKey, 'POST', '/contacts', { email, unsubscribed, segments: [{ id: segmentId }] })
    return
  }
  try {
    await call(apiKey, 'POST', `/contacts/${enc(email)}/segments/${enc(segmentId)}`)
  } catch (error) {
    // Already a member. Anything else is a real failure.
    if (!(error instanceof ResendApiError && (error.status === 409 || error.status === 422))) throw error
  }
}

/** Marks an existing contact unsubscribed. A contact Resend never had is already not mailed. */
export async function unsubscribeContact(apiKey: string, email: string): Promise<void> {
  try {
    await call(apiKey, 'PATCH', `/contacts/${enc(email)}`, { unsubscribed: true })
  } catch (error) {
    if (!(error instanceof ResendApiError && error.status === 404)) throw error
  }
}

/** Every contact in the segment, following pagination. */
export async function listSegmentContacts(apiKey: string, segmentId: string): Promise<ResendContact[]> {
  const contacts: ResendContact[] = []
  let after: string | undefined
  for (;;) {
    const query = new URLSearchParams({ segment_id: segmentId, limit: '100', ...(after ? { after } : {}) })
    const page = await call<List<ResendContact>>(apiKey, 'GET', `/contacts?${query}`)
    contacts.push(...page.data)
    if (!page.has_more || page.data.length === 0) return contacts
    after = page.data[page.data.length - 1]!.id
  }
}

export type ResendBroadcast = {
  id: string
  name: string | null
  segment_id: string | null
  status: string
  created_at: string
  sent_at: string | null
}

export async function listBroadcasts(apiKey: string): Promise<ResendBroadcast[]> {
  const page = await call<List<ResendBroadcast>>(apiKey, 'GET', '/broadcasts?limit=100')
  return page.data
}

export async function createAndSendBroadcast(
  apiKey: string,
  params: { segmentId: string; from: string; replyTo?: string; subject: string; name: string; html: string; text: string },
): Promise<{ id: string }> {
  return call<{ id: string }>(apiKey, 'POST', '/broadcasts', {
    segment_id: params.segmentId,
    from: params.from,
    ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    subject: params.subject,
    name: params.name,
    html: params.html,
    text: params.text,
    send: true,
  })
}

/** One plain email: the staff test send. */
export async function sendSingleEmail(
  apiKey: string,
  params: { from: string; to: string; subject: string; html: string; text: string },
): Promise<{ id: string }> {
  return call<{ id: string }>(apiKey, 'POST', '/emails', params)
}
