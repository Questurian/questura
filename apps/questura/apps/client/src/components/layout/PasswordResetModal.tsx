"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { usePasswordResetRequest } from '@/features/Auth/hooks/usePasswordResetRequest';
import { useCaptcha } from '@/features/Auth/hooks/useCaptcha';
import TurnstileWidget from '@/features/Auth/components/form/TurnstileWidget';
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
  const [checking, setChecking] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const resetRequest = usePasswordResetRequest();
  const { reset } = resetRequest;
  const captcha = useCaptcha('password-reset');

  useEffect(() => {
    if (!isOpen) {
      setSent(false);
      setCaptchaError(null);
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
    setCaptchaError(null);

    // Waits (the button spinning) if Cloudflare has not answered yet.
    let captchaToken: string | null;
    setChecking(true);
    try {
      captchaToken = await captcha.take();
    } catch (error) {
      setCaptchaError(error instanceof Error ? error.message : 'Please try again.');
      return;
    } finally {
      setChecking(false);
    }

    try {
      await resetRequest.mutateAsync({ email, captchaToken });
      setSent(true);
    } catch {
      // Shown through `resetRequest.error` below. The token is spent.
      captcha.refresh();
    }
  };

  const errorMessage = captchaError ?? resetRequest.error?.message;
  const busy = checking || resetRequest.isPending;

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
              {errorMessage && <AuthNotice messages={[errorMessage]} />}
              <div>
                <p className={authLabel}>Email</p>
                <p className="mt-2 h-12 w-full truncate rounded-[3px] border border-foreground/15 bg-paper px-3.5 text-[0.95rem] leading-[46px] text-foreground">
                  {email}
                </p>
              </div>
              {/* The bot check sits on the button: no room until Cloudflare
                  asks the reader to tick it. */}
              <div>
                {captcha.widget && <TurnstileWidget {...captcha.widget} />}
                <button type="submit" disabled={busy} className={authPrimaryButton}>
                  {busy ? (
                    <>
                      <Spinner />
                      <span>Sending…</span>
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
