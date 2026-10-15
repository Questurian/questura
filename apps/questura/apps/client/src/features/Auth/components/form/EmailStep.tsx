/**
 * Email input step for authentication flow
 * Shared component used by both Auth and LoginModal features
 */

import type { EmailStepProps } from '../../types';
import {
  OrContinueWithGoogle,
  Spinner,
  authFieldError,
  authInput,
  authLabel,
  authPrimaryButton,
} from './authFormParts';

export default function EmailStep({
  email,
  onChange,
  onSubmit,
  fieldError,
  loading,
  canContinue,
  inModal = false,
}: EmailStepProps) {
  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="email" className={authLabel}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          // The modal opens on a click that asked to sign in, so the field the
          // reader needs next is already the one with the caret.
          autoFocus={inModal}
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'email-error' : undefined}
          className={`mt-2 ${authInput(Boolean(fieldError))}`}
          placeholder="you@example.com"
          value={email}
          onChange={onChange}
          disabled={loading}
        />
        {fieldError && (
          <p id="email-error" className={authFieldError}>
            {fieldError}
          </p>
        )}
      </div>

      <button type="submit" disabled={loading || !canContinue} className={authPrimaryButton}>
        {loading ? (
          <>
            <Spinner />
            <span>Checking…</span>
          </>
        ) : (
          'Continue'
        )}
      </button>

      <OrContinueWithGoogle />
    </form>
  );
}
