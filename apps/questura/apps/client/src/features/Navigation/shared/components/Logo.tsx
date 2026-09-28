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

  return (
    <div className={wrapClass}>
      {/* The wordmark is a link home, not a heading. It renders in the desktop
          navbar, the mobile navbar and the footer at once, so an <h1> here put
          three "Questurian" headings on every page ahead of the real one. A
          page gets its single <h1> from its own content. */}
      <span
        className={`
          block font-display text-nav-wordmark font-bold leading-none m-0 p-0
          ${isInline ? "text-left" : ""}
          ${className}
        `}
        style={
          isInline
            ? undefined
            : {
                // Atlantic-style title-case wordmark, tight tracking.
                // font-size: 3.4rem (masthead) → 1.55rem (thin bar), delta = 1.85rem
                // letter-spacing: -0.02em (full) → 0em (compact), delta = 0.02em
                // --navbar-collapse is 0 at top, 1 when fully scrolled.
                // No CSS transition — the variable itself is frame-accurate.
                fontSize: "calc(3.4rem - var(--navbar-collapse, 0) * 1.85rem)",
                letterSpacing:
                  "calc(-0.02em + var(--navbar-collapse, 0) * 0.02em)",
              }
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
