"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronRight, LogOut, Moon, Sun, User as UserIcon, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/navigation/PublicLink";
import { readNavTheme, setNavTheme, type NavTheme } from "@/features/Navigation/lib/navTheme";
import { useLogoutMutation } from "@/lib/user/hooks";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuRowProps {
  href: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  onClose: () => void;
}

function MenuRow({ href, icon: Icon, title, hint, onClose }: MenuRowProps) {
  return (
    <Link
      keepFeedbackAfterUnmount
      onClick={onClose}
      href={href}
      className="group flex items-center gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.05] focus:outline-none focus-visible:border-white/25 focus-visible:bg-white/[0.05]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/80 transition-colors group-hover:text-white">
        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold leading-tight text-white">{title}</span>
        <span className="mt-1 block truncate text-[13px] leading-tight text-white/50">{hint}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-white/35 transition-all group-hover:translate-x-0.5 group-hover:text-white/70"
        strokeWidth={2}
      />
    </Link>
  );
}

/**
 * Light / dark navbar as a switch, laid out like a MenuRow. Same setting as the
 * toggle at the foot of the menu (lib/navTheme.ts), so it recolours the navbar
 * only. This modal is loaded in the browser only (UserModalRenderer, ssr:
 * false), so reading the saved choice during the first render is safe.
 */
function ThemeRow() {
  const [theme, setTheme] = useState<NavTheme>(() => readNavTheme());
  const dark = theme === "dark";
  const Icon = dark ? Moon : Sun;

  const toggle = () => {
    const next: NavTheme = dark ? "light" : "dark";
    setNavTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="group flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-white/10 hover:bg-white/[0.05] focus:outline-none focus-visible:border-white/25 focus-visible:bg-white/[0.05]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/80 transition-colors group-hover:text-white">
        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold leading-tight text-white">Dark mode</span>
        <span className="mt-1 block truncate text-[13px] leading-tight text-white/50">
          Switches the navbar colours
        </span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
          dark ? "bg-accent" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
            dark ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

export default function UserModal({ isOpen, onClose }: UserModalProps) {
  const logoutMutation = useLogoutMutation();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, focus lands inside on open and goes back to the navbar
  // button on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  if (!isOpen) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <style>{`
        @keyframes userSheetIn {
          from {
            transform: translateX(100%);
            opacity: 0.6;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes userOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes userItemRise {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .user-sheet-enter {
          animation: userSheetIn 0.3s ease-out forwards;
        }

        .user-overlay-enter {
          animation: userOverlayIn 0.25s ease-out forwards;
        }

        .user-reveal > * {
          animation: userItemRise 0.42s ease-out both;
        }

        .user-reveal > *:nth-child(2) {
          animation-delay: 70ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .user-sheet-enter,
          .user-overlay-enter,
          .user-reveal > * {
            animation: none;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
      >
        <button
          type="button"
          aria-label="Close modal"
          tabIndex={-1}
          className="user-overlay-enter absolute inset-0 cursor-auto bg-black/60"
          onClick={onClose}
        />

        <aside className="user-sheet-enter absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-white/15 bg-[#141414] text-white shadow-2xl 480:w-[420px]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                Questurian
              </p>
              <h2
                id="user-modal-title"
                className="mt-1 font-display text-[1.35rem] leading-none tracking-[0.02em]"
              >
                Account
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              aria-label="Close modal"
            >
              <X aria-hidden className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="user-reveal space-y-6">
              <nav aria-label="Account" className="space-y-1">
                <MenuRow
                  href="/account"
                  icon={UserIcon}
                  title="Account"
                  hint="Profile, email and password"
                  onClose={onClose}
                />
                <MenuRow
                  href="/account/bookmarks"
                  icon={Bookmark}
                  title="Bookmarks"
                  hint="Articles you have saved"
                  onClose={onClose}
                />
              </nav>

              <div className="border-t border-white/10 pt-5">
                <ThemeRow />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-default disabled:opacity-60"
            >
              <LogOut aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </button>
            <p className="mt-3 text-center text-[11px] text-white/35">
              <Link
                keepFeedbackAfterUnmount
                onClick={onClose}
                href="/terms"
                className="transition-colors hover:text-white/70 focus:outline-none focus-visible:text-white/70"
              >
                Terms
              </Link>
              <span aria-hidden className="mx-2">
                &middot;
              </span>
              <Link
                keepFeedbackAfterUnmount
                onClick={onClose}
                href="/privacy"
                className="transition-colors hover:text-white/70 focus:outline-none focus-visible:text-white/70"
              >
                Privacy
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
