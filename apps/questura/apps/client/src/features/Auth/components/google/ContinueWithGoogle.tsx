"use client";

import { useSyncExternalStore } from 'react';
import { detectInAppBrowser } from '../../lib/inAppBrowser';
import GoogleSignInButton from './GoogleSignInButton';

/**
 * Whether Google sign-in can be offered here. Inside an app's built-in
 * browser (Instagram, Facebook, TikTok…) Google refuses sign-in with its own
 * error page, so there the sign-in form acts as if Google did not exist: no
 * button and no note about it (owner, 2026-11-22: a "Google doesn't work"
 * note at the paywall scared Instagram readers off). Email works everywhere.
 *
 * Off until the browser says otherwise: the server has no user agent to go on,
 * and rendering the button first would flash it inside Instagram. On the
 * client the user agent never changes, so the store needs no subscription.
 */
const noSubscribe = () => () => {};

export function useGoogleSignInOffered(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => detectInAppBrowser(navigator.userAgent) === null,
    () => false,
  );
}

export default function ContinueWithGoogle({ className = '' }: { className?: string }) {
  if (!useGoogleSignInOffered()) return null;
  return <GoogleSignInButton className={className}>Continue with Google</GoogleSignInButton>;
}
