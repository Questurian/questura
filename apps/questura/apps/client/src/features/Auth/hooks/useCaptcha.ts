/**
 * The bot check for one form: what to draw, the token to send, and a fresh
 * one after each try. With no site key in the build it draws nothing and
 * `take` resolves `null` at once (`lib/turnstile.ts`).
 */

import { useCallback, useRef, useState } from 'react';
import type { TurnstileHandle, TurnstileWidgetProps } from '../components/form/TurnstileWidget';
import { createCaptchaGate, turnstileSiteKey } from '../lib/turnstile';

export interface Captcha {
  /** Props for `TurnstileWidget`, or `null` when the bot check is off. */
  widget: TurnstileWidgetProps | null;
  /** The token for this submit (single use), `null` when off. */
  take: () => Promise<string | null>;
  /** After a request spent the token: get the next one ready. */
  refresh: () => void;
}

export function useCaptcha(action: string): Captcha {
  const siteKey = turnstileSiteKey();
  const [gate] = useState(() => createCaptchaGate(siteKey));
  const handle = useRef<TurnstileHandle>(null);

  const take = useCallback(() => gate.take(), [gate]);
  const refresh = useCallback(() => {
    gate.expire();
    handle.current?.reset();
  }, [gate]);

  return {
    widget: siteKey
      ? { siteKey, action, onToken: gate.accept, onExpire: gate.expire, ref: handle }
      : null,
    take,
    refresh,
  };
}
