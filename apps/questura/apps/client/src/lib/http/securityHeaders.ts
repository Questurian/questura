/**
 * Sent on every page (`next.config.ts`, source `/:path*`). Launch harness D4.
 *
 * - `X-Frame-Options` and `frame-ancestors 'none'`: no other site may frame
 *   ours. Framed, a signed-in reader could be tricked into clicking a real
 *   button (Subscribe, Cancel subscription) laid under a decoy. Nothing here
 *   frames the site itself: no Payload live preview, no iframe of our pages.
 * - `nosniff`: a response is only ever what its Content-Type says.
 * - `Referrer-Policy`: other sites see our origin, never a full path that
 *   could carry `?returnTo=` or a session id.
 * - HSTS, one year, deliberately without `includeSubDomains` or `preload`:
 *   those commit every current and future subdomain to https and are hard to
 *   undo, so they are the owner's call. Browsers ignore HSTS over plain http,
 *   so localhost is unaffected.
 *
 * `frame-ancestors` is the only CSP directive enforced. The full policy below
 * is sent as `Content-Security-Policy-Report-Only`: browsers obey nothing in
 * it, they only log what it would have blocked in the console. Once a few
 * weeks of real pages show no violations from our own features, it can be
 * moved into the enforced header (2026-10-01 security audit, item 4).
 *
 * What it allows, and why:
 * - scripts: our own, plus inline ones (the theme and identity hints in the
 *   root layout, JSON-LD, Next's hydration data; there are no nonces yet),
 *   Endorsely's affiliate script, Instagram's embed.js, Google Maps.
 * - connections: our own origin, the API, Google Maps, Endorsely, Instagram.
 * - images: any https host. Article photos come from the Bunny CDN, but
 *   editors can paste images from elsewhere, and an image cannot run code.
 *   A build whose API is plain http (localhost, the readiness sandbox) also
 *   serves its photos over plain http, so it allows `http:` images too;
 *   otherwise every photo there is a console line. Live's API is https, so
 *   live's policy is unchanged.
 * - frames: Instagram embeds and Google Maps.
 * - no plugins (`object-src 'none'`), no `<base>` from elsewhere, forms only
 *   post to this site.
 */
export function reportOnlyContentSecurityPolicy(apiOrigin: string): string {
  const imageSources = apiOrigin.startsWith("http:") ? "https: http:" : "https:";
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://assets.endorsely.com https://www.instagram.com https://maps.googleapis.com https://*.gstatic.com",
    `connect-src 'self' ${apiOrigin} https://*.googleapis.com https://*.gstatic.com https://*.endorsely.com https://www.instagram.com`,
    `img-src 'self' data: blob: ${imageSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src https://www.instagram.com https://www.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The API's origin, from the address baked into the build. */
function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.questurian.com").origin;
  } catch {
    return "https://api.questurian.com";
  }
}

export const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyContentSecurityPolicy(apiOrigin()) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];
