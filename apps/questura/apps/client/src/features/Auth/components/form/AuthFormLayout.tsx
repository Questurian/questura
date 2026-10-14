/**
 * Layout wrapper for authentication forms
 * Shared component used by both Auth and LoginModal features
 */

import type { AuthFormLayoutProps } from '../../types';
import { AuthNotice } from './authFormParts';

export default function AuthFormLayout({
  children,
  inModal = false,
  title,
  subtitle,
  generalErrors,
}: AuthFormLayoutProps) {
  const containerClasses = inModal
    ? "w-full"
    : "min-h-screen flex items-center justify-center px-5 py-12";

  const contentClasses = inModal
    ? "w-full space-y-6"
    : "max-w-xl w-full bg-paper border border-foreground/15 rounded-[3px] p-6 480:p-8 space-y-6";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {!inModal && (
          <div>
            <h2 className="mt-6 text-center font-display text-[1.35rem] text-[#1A1A1A] 480:text-[1.55rem]">
              {title}
            </h2>
            <p className="mt-2 text-center text-[0.88rem] text-[#6b6a68] leading-[1.65]">
              {subtitle}
            </p>
          </div>
        )}

        <AuthNotice messages={generalErrors} />

        {children}
      </div>
    </div>
  );
}
