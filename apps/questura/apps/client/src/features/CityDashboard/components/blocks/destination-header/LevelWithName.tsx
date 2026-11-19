"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Height of a capital H in a computed font, from the glyph itself. */
function capHeight(style: CSSStyleDeclaration): number {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 0;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText("H").actualBoundingBoxAscent;
}

/** The y of an element's first baseline. */
function firstBaseline(element: Element): number {
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  element.prepend(probe);
  const y = probe.getBoundingClientRect().bottom;
  probe.remove();
  return y;
}

/**
 * The description column beside the name ("level with the name"). The server
 * renders it with padding worked out from the fonts' measured metrics, which
 * lands within a pixel; browsers round line boxes differently, so once the
 * fonts have loaded this nudges the padding until the first capitals start
 * exactly on the name's cap line. Side by side only (tablet and up).
 */
export function LevelWithName({
  className,
  style,
  padding,
  children,
}: {
  className: string;
  style: CSSProperties;
  /** The server's padding, in px. */
  padding: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const column = ref.current;
    const name = column?.parentElement?.querySelector("h2");
    const first = column?.querySelector("p");
    if (!column || !name || !first) return;
    let cancelled = false;

    const level = () => {
      if (cancelled) return;
      if (!window.matchMedia("(min-width: 768px)").matches) {
        column.style.removeProperty("--dh-level");
        return;
      }
      column.style.setProperty("--dh-level", `${padding}px`);
      const nameCapTop = firstBaseline(name) - capHeight(getComputedStyle(name));
      const textCapTop = firstBaseline(first) - capHeight(getComputedStyle(first));
      const exact = padding + nameCapTop - textCapTop;
      if (Math.abs(exact - padding) < 2) column.style.setProperty("--dh-level", `${exact}px`);
    };

    level();
    document.fonts.ready.then(level);
    document.fonts.addEventListener("loadingdone", level);
    window.addEventListener("resize", level);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", level);
      window.removeEventListener("resize", level);
    };
  }, [padding]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
