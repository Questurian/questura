'use client';

import { useState, type FormEvent } from 'react';

import PasswordStrengthIndicator from '@/features/Auth/components/PasswordStrengthIndicator';
import {
  authFieldError,
  authInput,
  authLabel,
  authPrimaryButton,
} from '@/features/Auth/components/form/authFormParts';
import { isPasswordValid, validatePasswordRequirements } from '@/features/Auth/lib/auth-utils';
import { post } from '@/lib/api';

/**
 * The password, asked for after the money (`onCheckoutSignUp`). Skipping is
 * allowed: "Forgot password?" creates one by email later.
 */
export function ChoosePassword({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPasswordValid(password)) {
      setError('Please meet each password rule below.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await post('/api/account/set-password', { newPassword: password });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your password. Please try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="mb-6 bg-paper p-5 text-left">
      <h2 className="font-display text-[1.1rem] text-foreground">One last thing: choose a password</h2>
      <p className="mt-1.5 text-[0.88rem] leading-[1.65] text-foreground/70">
        You will sign in with <span className="break-all font-medium text-foreground">{email}</span>.
      </p>
      <input type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
      <label htmlFor="new-member-password" className={`${authLabel} mt-4 block`}>
        Password
      </label>
      <input
        id="new-member-password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={saving}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'new-member-password-error' : undefined}
        className={`mt-2 ${authInput(Boolean(error))}`}
      />
      {error ? (
        <p id="new-member-password-error" role="alert" className={authFieldError}>
          {error}
        </p>
      ) : null}
      <PasswordStrengthIndicator requirements={validatePasswordRequirements(password)} />
      <button type="submit" disabled={saving} className={`${authPrimaryButton} mt-5`}>
        {saving ? 'Saving…' : 'Save and continue'}
      </button>
      <button
        type="button"
        onClick={onDone}
        disabled={saving}
        className="mt-4 block w-full text-center text-[0.84rem] text-foreground/70 underline underline-offset-2"
      >
        Do it later by email
      </button>
    </form>
  );
}
