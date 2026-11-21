/**
 * Which app's built-in browser this page is open in, if any.
 *
 * Google refuses to sign anyone in inside an app's embedded browser: it shows
 * its own "403: disallowed_useragent" page instead. Most visitors from social
 * posts tap the link inside Instagram (or Facebook, TikTok…), so the Google
 * button would dead-end them at the moment they want to join. The sign-in form
 * asks this first and offers email instead.
 *
 * Returns the app's name for the note ("Instagram"), "this app" for an
 * unnamed Android WebView, or null in a real browser.
 */
const NAMED_APPS: Array<[RegExp, string]> = [
  [/Instagram/i, 'Instagram'],
  [/Barcelona/, 'Threads'],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Snapchat/i, 'Snapchat'],
  [/Pinterest/i, 'Pinterest'],
  [/Twitter/i, 'X'],
  [/\bLine\//, 'LINE'],
];

export function detectInAppBrowser(userAgent: string): string | null {
  if (!userAgent) return null;
  for (const [pattern, name] of NAMED_APPS) {
    if (pattern.test(userAgent)) return name;
  }
  // Android marks every embedded WebView with "; wv)" — Google blocks those too.
  if (/Android/.test(userAgent) && /;\s*wv\)/.test(userAgent)) return 'this app';
  return null;
}
