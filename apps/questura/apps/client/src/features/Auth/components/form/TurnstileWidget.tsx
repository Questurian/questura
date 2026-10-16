"use client";

/**
 * Cloudflare Turnstile, drawn into the form that needs it. Only rendered when
 * the build has a site key (`useCaptcha`), so a build without one never loads
 * Cloudflare's script.
 *
 * `interaction-only`: most readers never see it. Cloudflare checks the
 * browser in the background and hands back a token; the box appears only
 * when it wants a reader to tick it. The container takes no room until then,
 * so the form keeps its spacing.
 */

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { TURNSTILE_SCRIPT_URL } from '../../lib/turnstile';

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'error-callback'?: (code: string) => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | null | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

/** Cloudflare's script, once per page. A failed load is retried next mount. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('Turnstile did not load'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Turnstile did not load'));
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export interface TurnstileHandle {
  /** Ask for a fresh token (the last one was spent by a request). */
  reset(): void;
}

export interface TurnstileWidgetProps {
  siteKey: string;
  /** Shown per form in Cloudflare's Turnstile analytics. */
  action: string;
  onToken: (token: string) => void;
  onExpire: () => void;
  ref?: Ref<TurnstileHandle>;
}

export default function TurnstileWidget({ siteKey, action, onToken, onExpire, ref }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onExpire });
  const [shown, setShown] = useState(false);

  useEffect(() => {
    callbacks.current = { onToken, onExpire };
  }, [onToken, onExpire]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        const id = widgetId.current;
        if (id !== null) window.turnstile?.reset(id);
      },
    }),
    []
  );

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        widgetId.current =
          turnstile.render(element, {
            sitekey: siteKey,
            action,
            theme: 'light',
            // `flexible` fills the column (300px at least); a narrower one
            // gets the compact box rather than a widget poking past the edge.
            size: element.clientWidth >= 300 ? 'flexible' : 'compact',
            appearance: 'interaction-only',
            callback: (token) => callbacks.current.onToken(token),
            'expired-callback': () => callbacks.current.onExpire(),
            'timeout-callback': () => callbacks.current.onExpire(),
            // Turnstile retries by itself; until then there is no token.
            'error-callback': () => callbacks.current.onExpire(),
          }) ?? null;
      })
      .catch(() => {
        // No script (blocked, offline): a submit's wait runs out and says so.
      });

    return () => {
      cancelled = true;
      const id = widgetId.current;
      widgetId.current = null;
      if (id !== null) window.turnstile?.remove(id);
      callbacks.current.onExpire();
    };
  }, [siteKey, action]);

  // Room below the box only while Cloudflare is showing it.
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setShown(entry.contentRect.height > 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className={shown ? 'mb-6' : undefined} />;
}
