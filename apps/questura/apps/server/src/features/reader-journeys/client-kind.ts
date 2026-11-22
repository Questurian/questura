/** What kind of browser sent a report, in words. The user agent itself is never stored. */

const NOT_A_READER =
  /(?<!cu)bot\b|crawl|spider|headless|facebookexternalhit|lighthouse|pagespeed|inspectiontool|googleother|k6\//i

export function isAutomated(userAgent: string): boolean {
  return !userAgent || NOT_A_READER.test(userAgent)
}

export function clientKind(userAgent: string): { os: string; browser: string; device: string } {
  const ua = userAgent
  const ios = /(?:iPhone|CPU) OS (\d+)/.exec(ua)
  // Safari froze the OS number at 18 from iOS 26 on; Version/ has the real one.
  const safari = /Version\/(\d+)/.exec(ua)
  const android = /Android (\d+)/.exec(ua)

  const os = /iPhone|iPad/.test(ua)
    ? `iOS ${safari?.[1] ?? ios?.[1] ?? ''}`.trim()
    : android
      ? `Android ${android[1]}`
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux|CrOS/.test(ua)
            ? 'Linux'
            : 'Unknown'

  const browser = /Instagram/.test(ua)
    ? 'Inside Instagram'
    : /FBAN|FBAV/.test(ua)
      ? 'Inside Facebook'
      : /musical_ly|TikTok/i.test(ua)
        ? 'Inside TikTok'
        : /EdgA?\/|EdgiOS/.test(ua)
          ? 'Edge'
          : /SamsungBrowser/.test(ua)
            ? 'Samsung Internet'
            : /Firefox|FxiOS/.test(ua)
              ? 'Firefox'
              : /CriOS|Chrome\//.test(ua)
                ? 'Chrome'
                : /Safari/.test(ua)
                  ? 'Safari'
                  : 'Other'

  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : android
        ? /SM-|Samsung/.test(ua)
          ? 'Samsung'
          : /Pixel/.test(ua)
            ? 'Pixel'
            : /Mobile/.test(ua)
              ? 'Android phone'
              : 'Android tablet'
        : 'Computer'

  return { os, browser, device }
}
