/**
 * Whether a reader is recorded at all (ADR-0019): only people in the US, only
 * when the browser does not say no, never a data centre.
 */

export type Connection = { country?: unknown; regionCode?: unknown; city?: unknown; asn?: unknown }

/*
 * Networks that host servers, not readers: Meta (link checks run a real
 * browser), Google, Amazon, Microsoft, DigitalOcean, OVH, Hetzner, Oracle,
 * Linode. Private Relay leaves through Cloudflare, Akamai and Fastly, which
 * are deliberately not here: those are iPhone readers.
 */
const SERVER_NETWORKS = new Set([32934, 15169, 396982, 16509, 14618, 8075, 14061, 16276, 24940, 31898, 63949])

export type Where = { record: false } | { record: true; region: string | null; city: string | null }

export function whereFor(connection: Connection | undefined, headers: Pick<Headers, 'get'>): Where {
  if (!connection || connection.country !== 'US') return { record: false }
  if (headers.get('sec-gpc') === '1' || headers.get('dnt') === '1') return { record: false }
  if (typeof connection.asn === 'number' && SERVER_NETWORKS.has(connection.asn)) return { record: false }
  return {
    record: true,
    region: typeof connection.regionCode === 'string' ? connection.regionCode : null,
    city: typeof connection.city === 'string' ? connection.city : null,
  }
}
