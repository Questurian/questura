/**
 * The bot check's half of a request: where its token goes, and what to tell
 * a reader when the server refused it.
 *
 * The server's Better Auth `captcha` plugin (Cloudflare Turnstile, on
 * `/sign-up/email`, `/sign-in/email` and `/request-password-reset`) reads the
 * token from this one header, and only in production with
 * `TURNSTILE_AUTH_ENABLED=true`. The server's CORS already allows it
 * (`apps/server/src/shared/utils/cors.ts`). Procedure:
 * `docs/procedures/turnstile.md`.
 */

export const CAPTCHA_HEADER = 'x-captcha-response';

/**
 * The header for one request: the token when there is one, nothing when
 * there is not. With no site key the form never has a token, so the request
 * is exactly what it was before the bot check existed.
 */
export function captchaHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { [CAPTCHA_HEADER]: token } : {};
}

// The plugin's own messages (better-auth `plugins/captcha/error-codes`):
// 400 when the header is missing, 403 when Cloudflare said no.
const REFUSED = new Set(['Missing CAPTCHA response', 'Captcha verification failed']);

export const CAPTCHA_FAILED_MESSAGE = "We couldn't confirm you're a person. Please try again.";

/**
 * What to tell a reader whose request the bot check refused, or `null` if
 * this is not that. A refused token is not a wrong password or an outage.
 */
export function captchaFailureMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const status = (error as { status?: unknown }).status;
  if (status !== 400 && status !== 403) return null;
  return REFUSED.has(error.message) ? CAPTCHA_FAILED_MESSAGE : null;
}
