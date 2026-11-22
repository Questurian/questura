/**
 * What the email step does next (no React, so node:test can run it).
 *
 * Only an address the API says is new skips the password. Not knowing is not
 * the same as new: it falls back to the password step.
 */

export type EmailCheck = {
  exists?: boolean;
  authMethods?: { hasPassword?: boolean; hasGoogle?: boolean };
};

type Next =
  | { step: 'checkout' }
  | { step: 'password'; exists: boolean | undefined; notice: string | null };

export const NO_PASSWORD_NOTICE =
  'No password on this account yet. Tap “Forgot password?” to set one.';

export function afterEmailCheck(check: EmailCheck, buying: boolean): Next {
  const exists = typeof check.exists === 'boolean' ? check.exists : undefined;
  if (buying && exists === false) return { step: 'checkout' };

  // A buyer who left before choosing a password, back on another browser.
  const noWayIn =
    exists === true && check.authMethods?.hasPassword === false && check.authMethods?.hasGoogle === false;
  return { step: 'password', exists, notice: noWayIn ? NO_PASSWORD_NOTICE : null };
}

/**
 * A failed checkout sign-up that still has a way forward: the address was
 * taken in the meantime (sign in), or this API predates the endpoint, as after
 * a rollback (sign up with a password). Null means show the error.
 */
export function afterCheckoutSignUpFailure(error: unknown): { exists: boolean } | null {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 422) return { exists: true };
  if (status === 404) return { exists: false };
  return null;
}
