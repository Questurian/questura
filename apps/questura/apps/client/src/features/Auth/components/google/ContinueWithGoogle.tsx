"use client";

import { useSyncExternalStore } from 'react';
import { detectInAppBrowser } from '../../lib/inAppBrowser';
import GoogleSignInButton from './GoogleSignInButton';

/**
 * The Google button, or, inside an app's built-in browser (Instagram,
 * Facebook, TikTok…), a note instead: Google refuses sign-in there with its
 * own error page, so the button would dead-end the reader. Email sign-in above
 * it works everywhere.
 *
 * The server renders the button (it has no user agent to go on); on the
 * client the user agent never changes, so the store needs no subscription.
 */
const noSubscribe = () => () => {};

export default function ContinueWithGoogle({ className = '' }: { className?: string }) {
  const inApp = useSyncExternalStore(
    noSubscribe,
    () => detectInAppBrowser(navigator.userAgent),
    () => null,
  );

  if (inApp) {
    return (
      <p className={`text-[0.875rem] leading-relaxed text-foreground/70 ${className}`}>
        Google sign-in doesn&rsquo;t open inside {inApp}. Use your email above, or tap{' '}
        <span className="font-medium text-foreground">&middot;&middot;&middot;</span> and choose{' '}
        <span className="font-medium text-foreground">Open in browser</span> to continue with Google.
      </p>
    );
  }

  return <GoogleSignInButton className={className}>Continue with Google</GoogleSignInButton>;
}
