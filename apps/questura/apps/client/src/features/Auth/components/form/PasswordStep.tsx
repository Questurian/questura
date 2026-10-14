/**
 * Password input step for authentication flow
 * Shared component used by both Auth and LoginModal features
 */

import { useResetPasswordModalStore } from '../../stores/resetPasswordModalStore';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';
import { validatePasswordRequirements } from '../../lib/auth-utils';
import type { PasswordStepProps } from '../../types';
import {
  OrContinueWithGoogle,
  Spinner,
  authFieldError,
  authInlineAction,
  authInput,
  authLabel,
  authPrimaryButton,
} from './authFormParts';

export default function PasswordStep({
  email,
  password,
  onChange,
  onSubmit,
  onBackToEmail,
  fieldError,
  loading,
  isSignUp,
  showPassword,
  onTogglePassword,
}: PasswordStepProps) {
  const openResetPasswordModal = useResetPasswordModalStore(state => state.openModal);

  const handleForgotPassword = () => {
    openResetPasswordModal(email);
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      {/* The address this step is for, with the way back to change it. Read-only
          text on a paper ground, so it does not read as a field to fill. */}
      <div>
        <p className={authLabel}>Email</p>
        <div className="relative mt-2">
          <p className="h-12 w-full truncate rounded-[3px] border border-foreground/15 bg-paper pl-3.5 pr-16 text-[0.95rem] leading-[46px] text-foreground">
            {email}
          </p>
          <button type="button" onClick={onBackToEmail} className={authInlineAction}>
            Edit
          </button>
          {/* Password managers pair the password with a username field in
              the same form; the shown address is text, so this is that field. */}
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          {!isSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[0.85rem] font-medium leading-none text-accent underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            // Reached by pressing Continue on the email step, so the caret
            // follows the reader instead of staying on a button that is gone.
            autoFocus
            required
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'password-error' : undefined}
            className={`${authInput(Boolean(fieldError))} pr-16`}
            placeholder={isSignUp ? "Choose a password" : "Your password"}
            value={password}
            onChange={onChange}
            disabled={loading}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            aria-pressed={showPassword}
            className={authInlineAction}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {fieldError && (
          <p id="password-error" className={authFieldError}>
            {fieldError}
          </p>
        )}
        {isSignUp && (
          <PasswordStrengthIndicator
            requirements={validatePasswordRequirements(password)}
          />
        )}
      </div>

      <button type="submit" disabled={loading} className={authPrimaryButton}>
        {loading ? (
          <>
            <Spinner />
            <span>{isSignUp ? 'Creating account…' : 'Signing in…'}</span>
          </>
        ) : (
          isSignUp ? 'Create account' : 'Sign in'
        )}
      </button>

      <OrContinueWithGoogle />
    </form>
  );
}
