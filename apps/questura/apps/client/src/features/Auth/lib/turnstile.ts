/**
 * Cloudflare Turnstile for the email sign-in, sign-up and password-reset
 * forms, without React: the site key, and the gate a form's submit waits on
 * for a token. The widget is `components/form/TurnstileWidget.tsx`; the
 * header the token travels in is `lib/api/captcha.ts`.
 *
 * Off unless the build has `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: no script is
 * loaded, nothing is drawn and every submit goes out at once without a token,
 * exactly as before. The server only asks for a token once its own flag is on,
 * so the site key ships first (`docs/procedures/turnstile.md`).
 */

/** Explicit rendering: the widget draws only where a form asks for it. */
export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * How long a submit waits for a token that has not arrived yet. Turnstile
 * usually has one within a couple of seconds of the form appearing, long
 * before a password is typed; the wait covers a quick typist, a slow phone,
 * or a reader ticking the box when Cloudflare asks them to.
 */
export const CAPTCHA_WAIT_MS = 15_000;

/** The build's site key, or `null` when the bot check is off. */
export function turnstileSiteKey(value: string | undefined = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY): string | null {
  const key = value?.trim();
  return key ? key : null;
}

/** No token in time: the widget failed to load, or is waiting on the reader. */
export class CaptchaNotReadyError extends Error {
  constructor() {
    super('Please complete the security check and try again.');
    this.name = 'CaptchaNotReadyError';
  }
}

export interface CaptchaGate {
  /** False when there is no site key: `take` then never waits. */
  readonly enabled: boolean;
  /** The widget produced a token. */
  accept(token: string): void;
  /** The token in hand expired, errored or was reset: wait for the next. */
  expire(): void;
  /**
   * The token for one submit, or `null` with the bot check off. A token is
   * single use, so it is handed out once; the form resets the widget after
   * the request for the next attempt. Rejects with `CaptchaNotReadyError`
   * when none arrives within `timeoutMs`.
   */
  take(timeoutMs?: number): Promise<string | null>;
}

export function createCaptchaGate(siteKey: string | null): CaptchaGate {
  let token: string | null = null;
  let waiting: ((token: string) => void) | null = null;

  return {
    enabled: siteKey !== null,
    accept(next) {
      if (waiting) {
        const resolve = waiting;
        waiting = null;
        resolve(next);
        return;
      }
      token = next;
    },
    expire() {
      token = null;
    },
    take(timeoutMs = CAPTCHA_WAIT_MS) {
      if (siteKey === null) return Promise.resolve(null);
      if (token) {
        const ready = token;
        token = null;
        return Promise.resolve(ready);
      }
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (waiting === onToken) waiting = null;
          reject(new CaptchaNotReadyError());
        }, timeoutMs);
        const onToken = (next: string) => {
          clearTimeout(timer);
          resolve(next);
        };
        // One submit at a time: the button is disabled while it waits.
        waiting = onToken;
      });
    },
  };
}
