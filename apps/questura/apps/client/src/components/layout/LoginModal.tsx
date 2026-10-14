"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EnhancedAuthForm } from "@/features/Auth";
import {
  AuthBackButton,
  authModalPanel,
  authModalPlacement,
  authModalSubtitle,
  authModalTitle,
} from "@/features/Auth/components/form/authFormParts";
import { useResetPasswordModalStore } from "@/features/Auth/stores/resetPasswordModalStore";
import type { EnhancedAuthFormHandle } from "@/features/Auth/types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  errorMessage?: string;
  prefillEmail?: string;
}

type FormStep = "email" | "sign-in" | "sign-up";

const STEP_COPY: Record<FormStep, { title: string; subtitle: string }> = {
  email: {
    title: "Sign In To Questurian",
    subtitle:
      "Don’t have an account yet? We’ll use the email address you enter to set one up for you.",
  },
  "sign-in": {
    title: "Welcome Back",
    subtitle: "Enter your password to sign in.",
  },
  "sign-up": {
    title: "Create Your Account",
    subtitle: "Choose a password to finish setting up your account.",
  },
};

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  title: customTitle,
  subtitle: customSubtitle,
  errorMessage,
  prefillEmail,
}: LoginModalProps) {
  const [step, setStep] = useState<FormStep>("email");
  const formRef = useRef<EnhancedAuthFormHandle>(null);
  const resetPasswordOpen = useResetPasswordModalStore((state) => state.isOpen);

  const handleSuccess = () => {
    onClose();
    onSuccess?.();
  };

  const handleModeChange = useCallback((isSignUp: boolean, showPasswordStep: boolean) => {
    setStep(!showPasswordStep ? "email" : isSignUp ? "sign-up" : "sign-in");
  }, []);

  // Back steps back: from the password step to the email step, and from the
  // email step out of the modal to the page underneath.
  const handleBack = () => {
    if (step === "email") onClose();
    else formRef.current?.backToEmail();
  };

  // Escape closes, unless the reset-password modal is open on top: that one
  // hears the same key and closes itself first.
  useEffect(() => {
    if (!isOpen || resetPasswordOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, resetPasswordOpen, onClose]);

  if (!isOpen) return null;

  const copy = STEP_COPY[step];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#1A1A1A]/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={authModalPlacement}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className={authModalPanel}
        >
          <AuthBackButton onClick={handleBack}>Back</AuthBackButton>

          <h2 id="login-modal-title" className={`mt-5 480:mt-6 ${authModalTitle}`}>
            {customTitle || copy.title}
          </h2>
          <p className={authModalSubtitle}>{customSubtitle || copy.subtitle}</p>

          <div className="mt-7">
            <EnhancedAuthForm
              ref={formRef}
              inModal={true}
              onSuccess={handleSuccess}
              errorMessage={errorMessage}
              prefillEmail={prefillEmail}
              onModeChange={handleModeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
