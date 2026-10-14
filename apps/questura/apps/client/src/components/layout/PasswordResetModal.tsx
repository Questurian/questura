"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { usePasswordResetRequest } from '@/features/Auth/hooks/usePasswordResetRequest';
import {
  AuthBackButton,
  AuthNotice,
  Spinner,
  authLabel,
  authModalPanel,
  authModalPlacement,
  authModalSubtitle,
  authModalTitle,
  authPrimaryButton,
} from '@/features/Auth/components/form/authFormParts';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function PasswordResetModal({
  isOpen,
  onClose,
  email
}: PasswordResetModalProps) {
  const [sent, setSent] = useState(false);
  const resetRequest = usePasswordResetRequest();
  const { reset } = resetRequest;

  useEffect(() => {
    if (!isOpen) {
      setSent(false);
      reset();
    }
  }, [isOpen, reset]);

  // Opens over the sign-in modal, so Escape closes this one and leaves the
  // sign-in modal where it was (LoginModal stops listening while this is open).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await resetRequest.mutateAsync({ email });
      setSent(true);
    } catch {
      // Shown through `resetRequest.error` below.
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-[#1A1A1A]/50"
        onClick={onClose}
        aria-label="Close password reset"
      />

      <div className={authModalPlacement}>
        <div
          className={authModalPanel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          {/* Same Back control as the sign-in modal: it returns to it. */}
          <AuthBackButton onClick={onClose}>Back to sign in</AuthBackButton>

          <h2 id="reset-password-title" className={`mt-5 480:mt-6 ${authModalTitle}`}>
            {sent ? 'Check Your Inbox' : 'Reset Password'}
          </h2>
          <p className={authModalSubtitle}>
            {sent ? (
              <>
                We sent a link to <span className="break-all font-medium text-foreground">{email}</span>.
                Open it to choose a new password.
              </>
            ) : (
              "We'll email you a secure link to choose a new password."
            )}
          </p>

          {sent ? (
            <button type="button" className={`mt-7 ${authPrimaryButton}`} onClick={onClose}>
              Done
            </button>
          ) : (
            <form className="mt-7 space-y-6" onSubmit={handleSubmit}>
              {resetRequest.error && <AuthNotice messages={[resetRequest.error.message]} />}
              <div>
                <p className={authLabel}>Email</p>
                <p className="mt-2 h-12 w-full truncate rounded-[3px] border border-foreground/15 bg-paper px-3.5 text-[0.95rem] leading-[46px] text-foreground">
                  {email}
                </p>
              </div>
              <button
                type="submit"
                disabled={resetRequest.isPending}
                className={authPrimaryButton}
              >
                {resetRequest.isPending ? (
                  <>
                    <Spinner />
                    <span>Sending…</span>
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
