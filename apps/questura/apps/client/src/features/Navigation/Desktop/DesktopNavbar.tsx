"use client";

import Link from "@/components/navigation/PublicLink";
import {
  AuthSlot,
  MenuIcon,
  Logo,
  SubscribeButton,
} from "../shared/components";
import { NAV_SECTIONS, type NavSection } from "../shared/sections";
import { useDesktopNavbarState } from "./hooks/use-desktop-navbar-state";

// Collapse progress at which the thin-bar links start coming in.
const LINKS_IN_FROM = 0.7;

// A section whose page doesn't exist yet shows as plain text: it looks the
// same as a link but has no hover and nothing to click.
function Section({ section, className = "" }: { section: NavSection; className?: string }) {
  return section.href ? (
    <Link href={section.href} className={`${className} hover:text-nav-link-hover`}>
      {section.label}
    </Link>
  ) : (
    <span className={className}>{section.label}</span>
  );
}

interface DesktopNavbarProps {
  /** Fully collapsed: the section links show in the thin bar. */
  locked: boolean;
}

export default function DesktopNavbar({ locked }: DesktopNavbarProps) {
  const {
    loading,
    isAuthenticated,
    isActive,
    shouldShowSubscribe,
  } = useDesktopNavbarState();

  return (
    <div
      className="w-full border-b border-nav-rule bg-nav-bg"
      style={{
        // One constant bottom rule. As the bar shrinks it rises over the
        // section row and eats it from the bottom up. The shadow deepens as
        // the bar collapses; its strength is part of the navbar theme.
        boxShadow:
          "0 1px 12px rgb(0 0 0 / calc(var(--navbar-collapse, 0) * var(--nav-shadow-strength)))",
      }}
    >
      <div
        className="w-full px-6"
        style={{
          // 28px (masthead) → 10px (thin bar). Every animated height here
          // is rounded to a whole pixel: fractional heights left the rules
          // sitting between pixel rows, so they wobbled 1px and looked
          // thicker/thinner from frame to frame.
          paddingTop: "round(calc(28px - var(--navbar-collapse, 0) * 18px), 1px)",
          paddingBottom: "round(calc(20px - var(--navbar-collapse, 0) * 10px), 1px)",
        }}
      >
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-8 justify-self-start">
            <MenuIcon iconClassName="!text-nav-ink h-6 w-6" />
            {/* The section links again, in the thin bar. Part of the scroll
                animation itself, not a timed fade: over the last 30% of the
                collapse they drop in from 8px above and fade up, landing
                exactly as the wordmark reaches its final size (and leaving
                the same way on the way back). Clickable once locked. */}
            <ul
              inert={!locked}
              className={`flex items-center gap-6 font-[family-name:var(--font-dm-sans)] text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-nav-link ${
                locked ? "" : "pointer-events-none"
              }`}
              style={{
                opacity: `calc((var(--navbar-collapse, 0) - ${LINKS_IN_FROM}) / ${1 - LINKS_IN_FROM})`,
                transform: `translateY(calc(clamp(0, (1 - var(--navbar-collapse, 0)) / ${1 - LINKS_IN_FROM}, 1) * -8px))`,
              }}
            >
              {NAV_SECTIONS.map((s) => (
                <li key={s.label} className={s.wideOnly ? "hidden 1280:list-item" : ""}>
                  <Section section={s} className="whitespace-nowrap" />
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/"
            data-no-hover-underline
            className="flex cursor-pointer items-center justify-self-center"
            // The wordmark's line box is as tall as its (fractional) font
            // size; pin the box to the nearest whole pixel.
            style={{ height: "round(calc(3.4rem - var(--navbar-collapse, 0) * 1.85rem), 1px)" }}
          >
            <Logo />
          </Link>
          <div className="flex items-center justify-self-end gap-3">
            {/* Public purchase link must not wait for the session request.
                While pending, the pre-paint hint hides it for members. */}
            {(loading || shouldShowSubscribe) ? (
              <Link
                href="/join"
                className="nav-subscribe inline-flex items-center"
                data-pending={loading || undefined}
              >
                <SubscribeButton />
              </Link>
            ) : null}
            <AuthSlot
              loading={loading}
              isAuthenticated={isAuthenticated}
              isMember={isActive}
              signInClassName="!text-nav-ink"
              align="start"
            />
          </div>
        </div>
      </div>

      {/* Section row. A divider sits on top of it when the bar is fully
          expanded and fades out over the first 1/8 of the collapse, so by
          the time anything visibly moves only one rule is left: the bar's
          bottom rule, which climbs over the row as it shrinks from the
          bottom (links anchored to the top) and fades them as it covers
          them. Scroll-linked like everything else, so it comes back over
          the last 1/8 of the expand, in step with the wordmark. */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "round(calc(44px - var(--navbar-collapse, 0) * 44px), 1px)",
          opacity: "calc(1 - var(--navbar-collapse, 0) * 1.5)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-nav-rule"
          style={{ opacity: "calc(1 - var(--navbar-collapse, 0) * 8)" }}
        />
        <ul className="flex h-[44px] items-center justify-center gap-8 px-6 font-[family-name:var(--font-dm-sans)] text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-nav-link">
          {NAV_SECTIONS.map((s) => (
            <li key={s.label}>
              <Section section={s} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
