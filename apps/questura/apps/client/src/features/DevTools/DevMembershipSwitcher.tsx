"use client";

import { useCallback, useEffect, useState } from "react";

import { getBackendUrl } from "@/lib/api";
import { useDevStore } from "@/lib/stores/devStore";
import { useLoginModalStore } from "@/lib/stores/loginModalStore";
import { identityStore } from "@/lib/user/currentIdentity";
import { writeHint } from "@/lib/user/identityHint";

/**
 * Localhost-only corner switcher: view the signed-in reader as a member or as
 * not a member, and the page reloads as that reader. It also holds the maps
 * switch for listicle articles.
 *
 * It writes the local database through `/api/dev/membership`, the same write
 * `pnpm dev:member` makes, so the server, the paywall and the navbar all agree.
 * Nothing reaches Stripe. The live build never contains this file (see
 * `DevTools.tsx`), and the route answers 404 on anything but a Mac.
 *
 * The route knows more states (cancelling, payment failed, paused, ...) and
 * `pnpm dev:member` can still set them; this panel offers only the two that
 * matter day to day.
 */

/** The two states the panel offers, by the route's state names. */
const CHOICES = [
  { name: "member", label: "Member" },
  { name: "none", label: "Not a member" },
] as const;

type StateOption = { name: string; label: string; about: string; active: boolean };
type Status =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "signed-out"; states: StateOption[] }
  | { kind: "signed-in"; email: string; state: string; states: StateOption[] };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const endpoint = () => `${getBackendUrl()}/api/dev/membership`;

export default function DevMembershipSwitcher() {
  const [onLocalhost, setOnLocalhost] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mapsEnabled, toggleMapsEnabled } = useDevStore();

  useEffect(() => {
    setOnLocalhost(LOCAL_HOSTS.has(window.location.hostname));
  }, []);

  const load = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch(endpoint(), { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        setStatus({ kind: "unavailable", reason: `The local API answered ${response.status}. Is the site running with pnpm dev?` });
        return;
      }
      const body = await response.json();
      setStatus(body.signedIn
        ? { kind: "signed-in", email: body.email, state: body.state, states: body.states }
        : { kind: "signed-out", states: body.states });
    } catch {
      setStatus({ kind: "unavailable", reason: "Can't reach the local API on port 4000. The switcher needs pnpm dev." });
    }
  }, []);

  // Once on arrival, so the chip names the current state, and again on every open.
  useEffect(() => {
    if (onLocalhost) void load();
  }, [onLocalhost, load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const reloadAs = (hint: "anon" | "user" | "member") => {
    writeHint(hint);
    identityStore.invalidate();
    window.location.reload();
  };

  const choose = async (name: string) => {
    setBusy(name);
    setError(null);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: name }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? `Failed (${response.status}).`);
        return;
      }
      reloadAs(body.active ? "member" : "user");
    } catch {
      setError("Can't reach the local API.");
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy("sign-out");
    try {
      await fetch(`${getBackendUrl()}/api/visitor-auth/sign-out`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } finally {
      reloadAs("anon");
    }
  };

  const signIn = () => {
    setOpen(false);
    useLoginModalStore.getState().openLoginModal();
  };

  if (!onLocalhost) return null;

  // Whether the reader currently has paid access, whichever named state they
  // are in (yearly and cancelling count as members). Undefined for a row no
  // named state wrote, so neither choice shows as selected.
  const currentActive =
    status.kind === "signed-in" ? status.states.find((s) => s.name === status.state)?.active : undefined;

  return (
    <div className="fixed bottom-5 left-[64px] z-[2147483000] font-mono text-[12px] leading-snug text-[#E9E6DF]">
      {open && (
        <div
          role="dialog"
          aria-label="Developer: view the site as"
          className="absolute bottom-[calc(100%+8px)] left-0 w-[280px] overflow-hidden rounded-lg border border-white/10 bg-[#15171C] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        >
          <div className="border-b border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">View the site as</div>
            <div className="mt-1 truncate text-white/80">
              {status.kind === "signed-in" ? status.email : status.kind === "signed-out" ? "Signed out" : " "}
            </div>
          </div>

          {status.kind === "loading" && <div className="px-3 py-3 text-white/50">Loading…</div>}
          {status.kind === "unavailable" && <div className="px-3 py-3 text-[#F2B8A8]">{status.reason}</div>}

          {status.kind === "signed-out" && (
            <div className="flex flex-col gap-2 px-3 py-3">
              <p className="text-white/60">Sign in once with your local account; after that, pick any state here.</p>
              <button type="button" onClick={signIn} className="rounded-md bg-[#3B5BDB] px-3 py-2 text-left font-semibold text-white hover:bg-[#3452C9]">
                Sign in
              </button>
            </div>
          )}

          {status.kind === "signed-in" && (
            <ul className="py-1">
              {CHOICES.map(({ name, label }) => {
                const selected = currentActive === (name === "member");
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => choose(name)}
                      disabled={busy !== null}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-[7px] text-left transition-colors hover:bg-white/[0.06] disabled:cursor-wait ${selected ? "bg-white/[0.08] text-white" : "text-white/75"}`}
                    >
                      <span>{busy === name ? "Switching…" : label}</span>
                      {selected && <span aria-hidden className="text-[#8FD3A6]">●</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && <div className="border-t border-white/10 px-3 py-2 text-[#F2B8A8]">{error}</div>}

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2">
            <span className="text-white/75">Maps on articles</span>
            <button
              type="button"
              role="switch"
              aria-checked={mapsEnabled}
              onClick={toggleMapsEnabled}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB] ${
                mapsEnabled
                  ? "border-[#3B5BDB] bg-[#3B5BDB] text-white"
                  : "border-white/20 text-white/55 hover:border-white/40 hover:text-white/80"
              }`}
            >
              {mapsEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[10px] text-white/40">
            <span>Local database only · no Stripe</span>
            {status.kind === "signed-in" && (
              <button type="button" onClick={signOut} disabled={busy !== null} className="text-[11px] text-white/70 underline-offset-2 hover:text-white hover:underline">
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-[#15171C] px-3.5 font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]"
      >
        <span>DEV</span>
        {currentActive !== undefined && (
          <span className="font-normal text-white/60">{currentActive ? "Member" : "Not a member"}</span>
        )}
        {status.kind === "signed-in" && status.state === "other" && <span className="font-normal text-white/60">custom state</span>}
        {!mapsEnabled && <span className="font-normal text-white/60">maps off</span>}
      </button>
    </div>
  );
}
