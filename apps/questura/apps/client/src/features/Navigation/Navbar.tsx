"use client";

import DesktopNavbar from "./Desktop/DesktopNavbar";
import MobileNavbar from "./Mobile/MobileNavbar";
import { useEffect, useRef, useState } from "react";
import { primeIdentity } from "@/lib/user/currentIdentity";
import { applyNavTheme, NAV_THEME_KEY, readNavTheme } from "./lib/navTheme";

// Ask who is reading while the page is still hydrating, not after. The
// navbar's query joins this request (currentIdentity.ts).
primeIdentity();

// Scroll distance over which the navbar goes from expanded to collapsed. It is
// read off the real scroll position: the navbar never consumes input to
// animate itself, so the page moves at full speed from the first flick (#589).
const COLLAPSE_PX = 120;

// Lerp factor: how fast the rendered value chases the target each frame.
// Lower = smoother / more lag. 0.09 gives a nice trailing feel.
const LERP = 0.09;

// The lerp's last few percent is invisible but slow (~0.5s from 0.97 to 1 at
// LERP 0.09), so the bar counts as locked once it is this close to fully
// collapsed and still headed there. Locked is when the section links show in
// the thin bar (DesktopNavbar).
const LOCK_AT = 0.97;

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  // True once the rendered collapse has settled at 1.
  const [locked, setLocked] = useState(false);

  // The navbar is in flow and changes height as it collapses. With the
  // browser's scroll anchoring on, every height change nudges scrollY to keep
  // the content still, which changes the collapse target, which changes the
  // height again: on a slow scroll back up the bar bounced a few px per frame
  // (and the rules flickered with it). The collapse already accounts for the
  // height change, so anchoring is switched off while this navbar is mounted.
  useEffect(() => {
    const root = document.documentElement.style;
    const prev = root.overflowAnchor;
    root.overflowAnchor = "none";
    return () => {
      root.overflowAnchor = prev;
    };
  }, []);

  // A navbar colour picked in another tab repaints this one too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === NAV_THEME_KEY) applyNavTheme(readNavTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const collapseFromScroll = () =>
      Math.min(1, Math.max(0, window.scrollY / COLLAPSE_PX));

    let rafId = 0;
    let targetVal = collapseFromScroll(); // where the collapse should end up
    let currentVal = targetVal; // lerp-smoothed value written to CSS

    // Lerp loop. It runs only while the rendered value is still chasing the
    // target; once it has snapped to an endpoint there is nothing left to
    // write, so it stops instead of burning a frame forever. `wake` restarts
    // it whenever a scroll moves the target.
    const tick = () => {
      currentVal += (targetVal - currentVal) * LERP;
      if (targetVal === 1 && currentVal > 0.995) currentVal = 1;
      if (targetVal === 0 && currentVal < 0.005) currentVal = 0;

      setLocked(targetVal === 1 && currentVal >= LOCK_AT);
      const borderAlpha = currentVal === 0 || currentVal === 1 ? 0.1 : 0;
      document.documentElement.style.setProperty(
        "--navbar-collapse",
        String(currentVal)
      );
      document.documentElement.style.setProperty(
        "--navbar-border-alpha",
        String(borderAlpha)
      );

      if (currentVal === targetVal) {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    // Idempotent: a loop that is already running is left alone.
    const wake = () => {
      if (rafId === 0) rafId = requestAnimationFrame(tick);
    };

    wake();

    // Observe, never consume. Every input -- wheel, trackpad, touch, PageDown,
    // Space, Home/End, scrollTo -- arrives here the same way.
    const handleScroll = () => {
      const next = collapseFromScroll();
      if (next === targetVal) return;
      targetVal = next;
      wake();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Keep --navbar-height in sync with the real nav height at every animation frame
  // so that consumers (e.g. the maps page sticky panel) can track it smoothly.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const setHeight = (h: number) =>
      document.documentElement.style.setProperty("--navbar-height", `${h}px`);

    setHeight(el.offsetHeight);

    const ro = new ResizeObserver((entries) => {
      const h =
        entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
      setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // `site-nav` scopes the navbar palette: the dark theme recolours this
    // subtree and nothing else (foundations.css, "Navbar theme").
    <nav ref={navRef} className="site-nav sticky top-0 z-40">
      <div className="hidden 1024:block">
        <DesktopNavbar locked={locked} />
      </div>
      <div className="h-[55px] 1024:hidden">
        <MobileNavbar />
      </div>
    </nav>
  );
}
