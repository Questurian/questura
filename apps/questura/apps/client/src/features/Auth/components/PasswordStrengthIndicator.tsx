"use client";

import { Check } from 'lucide-react';
import { validatePasswordRequirements, type PasswordRequirements } from '../lib/auth-utils';

interface PasswordStrengthIndicatorProps {
  requirements: PasswordRequirements;
}

export default function PasswordStrengthIndicator({ requirements }: PasswordStrengthIndicatorProps) {
  const requirementsList = [
    { key: 'hasMinLength', label: '8+ characters', met: requirements.hasMinLength },
    { key: 'hasNumber', label: 'A number', met: requirements.hasNumber },
    { key: 'hasUppercase', label: 'An uppercase letter', met: requirements.hasUppercase },
    { key: 'hasSymbol', label: 'A symbol', met: requirements.hasSymbol },
  ];

  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2" aria-label="Password requirements">
      {requirementsList.map((requirement) => (
        <li
          key={requirement.key}
          className={`flex items-center gap-2 text-[0.8rem] transition-colors ${
            requirement.met ? 'text-forest' : 'text-foreground/55'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
              requirement.met ? 'border-forest bg-forest text-white' : 'border-foreground/25'
            }`}
          >
            {requirement.met && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
          </span>
          <span>
            {requirement.label}
            <span className="sr-only">{requirement.met ? ' (met)' : ' (not yet)'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Password policy loads with the strength UI, rather than the form shell. */
export function PasswordStrengthForInput({ password }: { password: string }) {
  return <PasswordStrengthIndicator requirements={validatePasswordRequirements(password)} />;
}
