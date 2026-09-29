"use client";

import DesktopNavbar from "./Desktop/DesktopNavbar";
import MobileNavbar from "./Mobile/MobileNavbar";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { primeIdentity } from "@/lib/user/currentIdentity";
import { applyNavTheme, NAV_THEME_KEY, readNavTheme } from "./lib/navTheme";
import { showsMasthead } from "./lib/navbarMasthead";

// Ask who is reading while the page is still hydrating, not after. The
// navbar's query joins this request (currentIdentity.ts).
primeIdentity();

// Scroll distance over which the navbar goes from expanded to collapsed. It is
// read off the real scroll position: the navbar never consumes input to
// animate itself, so the page moves at full speed from the first flick (#589).
const COLLAPSE_PX = 120;

// Lerp factor: the share of the remaining distance the rendered value closes
// per 60Hz frame (scaled by real frame time, so 120Hz screens run at the same
// speed). Lower = smoother / more lag. The lab's 0.09 took ~0.6s to lock, so a
// quick flick left the page far down before the bar finished; 0.25 locks in
// ~0.2s and settles in ~0.3s while still easing in.
const LERP = 0.25;
const FRAME_MS = 1000 / 60;

// The lerp's last few percent is invisible but slow, so the bar counts as
// locked once it is this close to fully collapsed and still headed there.
// Locked is when the section links show in the thin bar (DesktopNavbar).
const LOCK_AT = 0.97;

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  // True once the rendered collapse has settled at 1.
  const [locked, setLocked] = useState(false);
  // Known during the server render too, so a pinned page paints the thin bar
  // on its first frame rather than shrinking into it.
  // Only home, country and city pages get the big masthead (navbarMasthead.ts).
  const pinnedThin = !showsMasthead(usePathname() ?? "/");

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
    // Pinned pages report fully collapsed to the whole page too: the itinerary
    // map column sizes itself off --navbar-collapse on <html>.
    const collapseFromScroll = () =>
      pinnedThin ? 1 : Math.min(1, Math.max(0, window.scrollY / COLLAPSE_PX));

    let rafId = 0;
    let lastFrame = 0; // timestamp of the previous tick; 0 = loop just woke
    let targetVal = collapseFromScroll(); // where the collapse should end up
    let currentVal = targetVal; // lerp-smoothed value written to CSS

    // Lerp loop. It runs only while the rendered value is still chasing the
    // target; once it has snapped to an endpoint there is nothing left to
    // write, so it stops instead of burning a frame forever. `wake` restarts
    // it whenever a scroll moves the target.
    const tick = (now: number) => {
      // Clamp the gap so a tab coming back from the background doesn't jump.
      const frames = lastFrame ? Math.min((now - lastFrame) / FRAME_MS, 4) : 1;
      lastFrame = now;
      currentVal += (targetVal - currentVal) * (1 - (1 - LERP) ** frames);
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
      if (rafId !== 0) return;
      lastFrame = 0;
      rafId = requestAnimationFrame(tick);
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
  }, [pinnedThin]);

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
    // A pinned page sets the collapse on the navbar itself, which wins over
    // the scroll-driven value on <html> for everything inside it.
    <nav
      ref={navRef}
      className="site-nav sticky top-0 z-40"
      style={pinnedThin ? ({ "--navbar-collapse": 1 } as CSSProperties) : undefined}
    >
      <div className="hidden 1024:block">
        <DesktopNavbar locked={pinnedThin || locked} />
      </div>
      <div className="h-16 1024:hidden">
        <MobileNavbar />
      </div>
    </nav>
  );
}
