"use client";

interface LogoProps {
  className?: string;
  subtitle?: string;
  subtitleClassName?: string;
  /** Use in toolbars: single line, no centered block wrapper (pairs cleanly with icons). */
  variant?: "default" | "inline";
}

export default function Logo({
  className = "",
  subtitle = "",
  subtitleClassName = "",
  variant = "default",
}: LogoProps) {
  const isInline = variant === "inline";
  const wrapClass = isInline ? "inline-flex min-w-0 items-center" : "text-center";

  // The wordmark's box is sized from Playfair Display's own advance width,
  // not from whichever face is painting. On a cold visit the metric-matched
  // fallback paints first and is ~8% narrower; without a fixed width the box
  // grew when Playfair arrived and a centred wordmark jumped sideways (issue
  // #1). 5.24em is "Questurian" in Playfair Display 700 with no tracking;
  // letter-spacing adds after each of its 10 letters. Callers set tracking
  // through --wordmark-tracking so the width can account for it.
  const reservedWidth = "calc(5.24em + 10 * var(--wordmark-tracking, 0em))";

  return (
    <div className={wrapClass}>
      {/* The wordmark is a link home, not a heading. It renders in the desktop
          navbar, the mobile navbar and the footer at once, so an <h1> here put
          three "Questurian" headings on every page ahead of the real one. A
          page gets its single <h1> from its own content. */}
      <span
        className={`
          block shrink-0 whitespace-nowrap font-display text-nav-wordmark font-bold leading-none m-0 p-0
          ${isInline ? "text-left" : ""}
          ${className}
        `}
        style={
          isInline
            ? { width: reservedWidth, letterSpacing: "var(--wordmark-tracking, 0em)" }
            : ({
                // Atlantic-style title-case wordmark, tight tracking.
                // font-size: 3.4rem (masthead) → 1.55rem (thin bar), delta = 1.85rem
                // letter-spacing: -0.02em (full) → 0em (compact), delta = 0.02em
                // --navbar-collapse is 0 at top, 1 when fully scrolled.
                // No CSS transition — the variable itself is frame-accurate.
                fontSize: "calc(3.4rem - var(--navbar-collapse, 0) * 1.85rem)",
                "--wordmark-tracking":
                  "calc(-0.02em + var(--navbar-collapse, 0) * 0.02em)",
                letterSpacing: "var(--wordmark-tracking)",
                width: reservedWidth,
              } as React.CSSProperties)
        }
      >
        Questurian
      </span>
      {subtitle ? (
        <p
          className={`
            font-display italic text-nav-subtitle mt-1
            text-[0.82rem]
            550:text-[0.95rem]
            1024:text-[1.4rem]
            ${subtitleClassName}
          `}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
