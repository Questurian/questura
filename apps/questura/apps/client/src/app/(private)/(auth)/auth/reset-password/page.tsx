"use client";

import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

import { post } from '@/lib/api';
const PasswordStrengthIndicator = lazy(() => import('@/features/Auth/components/PasswordStrengthIndicator').then((module) => ({ default: module.PasswordStrengthForInput })));
import {
  AuthNotice,
  Spinner,
  authInlineAction,
  authInput,
  authLabel,
  authPagePanel,
  authModalSubtitle,
  authModalTitle,
  authPrimaryButton,
} from '@/features/Auth/components/form/authFormParts';

/**
 * Where the reset email's link lands. Dressed as the sign-in modal's card, so
 * the reader who left the modal for their inbox comes back to the same form.
 */
function NewPasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={name} className={authLabel}>
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={name}
          name={name}
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          required
          autoFocus={autoFocus}
          className={`${authInput()} pr-16`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-pressed={shown}
          className={authInlineAction}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This password reset link is invalid or has expired.');
      return;
    }

    const { isPasswordValid } = await import('@/features/Auth/lib/auth-utils');
    if (!isPasswordValid(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, number, and symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    try {
      await post('/api/visitor-auth/reset-password', { token, newPassword });
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reset password.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-start justify-center px-4 py-8 480:items-center 480:px-6 480:py-16">
      <div className={authPagePanel}>
        <h1 className={authModalTitle}>
          {complete ? 'Password Updated' : 'Reset Password'}
        </h1>
        <p className={authModalSubtitle}>
          {complete ? 'Your password has been updated.' : 'Choose a new password for your account.'}
        </p>

        {complete ? (
          <Link href="/?showLogin=true" className={`mt-7 ${authPrimaryButton}`}>
            Sign in
          </Link>
        ) : (
          <form className="mt-7 space-y-6" onSubmit={handleSubmit} noValidate>
            <AuthNotice messages={error ? [error] : []} />
            <div>
              <NewPasswordField
                label="New password"
                name="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Choose a password"
                disabled={pending}
                autoFocus
              />
              <Suspense fallback={null}><PasswordStrengthIndicator password={newPassword} /></Suspense>
            </div>
            <NewPasswordField
              label="Confirm new password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Type it again"
              disabled={pending}
            />
            <button type="submit" disabled={pending} className={authPrimaryButton}>
              {pending ? (
                <>
                  <Spinner />
                  <span>Updating…</span>
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
