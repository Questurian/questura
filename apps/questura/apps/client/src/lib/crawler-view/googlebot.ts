/**
 * Is this request really Googlebot? (ADR-0009, revised 2026-11-21.)
 *
 * Both halves are required:
 *
 * - The address is in Google's published `googlebot.json`. A name is one
 *   `curl` flag away.
 * - The name is Googlebot's own. An address is not enough either: that same
 *   list serves Google-InspectionTool, behind the Rich Results Test, which
 *   anyone may point at any page and which shows them the HTML it got.
 *
 * Anything unparseable is not Googlebot. A range Google adds after our copy
 * was taken gets the preview until the copy is refreshed, the safe direction.
 */

const GOOGLEBOT_TOKEN = /(?:^|[\s;(])Googlebot\/\d+\.\d+(?:$|[\s;)])/
const NOT_SEARCH = /InspectionTool|GoogleOther|Google-Extended|Storebot|AdsBot|Mediapartners|APIs-Google/i

function ipv4(value: string): bigint | null {
  const parts = value.split('.')
  if (parts.length !== 4) return null
  let out = BigInt(0)
  for (const part of parts) {
    if (!/^(?:0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255) return null
    out = (out << BigInt(8)) | BigInt(Number(part))
  }
  return out
}

function ipv6(value: string): bigint | null {
  const halves = value.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null

  const groups = [...head, ...new Array<string>(missing).fill('0'), ...tail]
  let out = BigInt(0)
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null
    out = (out << BigInt(16)) | BigInt(parseInt(group, 16))
  }
  return out
}

function inPrefix(ip: string, prefix: string): boolean {
  const [network, length, extra] = prefix.split('/')
  if (extra !== undefined || !network || !/^\d{1,3}$/.test(length ?? '')) return false

  const isV6 = ip.includes(':')
  if (isV6 !== network.includes(':')) return false

  const width = isV6 ? 128 : 32
  const bits = Number(length)
  if (bits < 1 || bits > width) return false

  const parse = isV6 ? ipv6 : ipv4
  const address = parse(ip)
  const base = parse(network)
  if (address === null || base === null) return false

  const shift = BigInt(width - bits)
  return address >> shift === base >> shift
}

export function isVerifiedGooglebot(
  caller: { ip: string | null; userAgent: string | null },
  prefixes: readonly string[],
): boolean {
  const { ip, userAgent } = caller
  if (!ip || !userAgent) return false
  if (!GOOGLEBOT_TOKEN.test(userAgent) || NOT_SEARCH.test(userAgent)) return false
  return prefixes.some((prefix) => inPrefix(ip, prefix))
}
