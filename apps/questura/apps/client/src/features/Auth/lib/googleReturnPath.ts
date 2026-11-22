/**
 * Where Google sign-in comes back to: this page, with the paywall's `returnTo`
 * and no other parameter. A `returnTo` that is not a path on this site is
 * dropped here; the readers of it (checkout, the success page) validate again.
 */
export function googleReturnPath(pathname: string, search: string): string {
  const returnTo = new URLSearchParams(search).get('returnTo');
  if (!returnTo || !/^\/(?![/\\])[^\\\s]*$/.test(returnTo)) return pathname;
  return `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
}
