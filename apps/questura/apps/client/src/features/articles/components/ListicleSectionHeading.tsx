import type { JSX } from "react";
import { Playfair_Display } from "next/font/google";
import {
  groupListicleItemsBySection,
  listicleSectionAnchors,
} from "@/features/articles/lib/listicleSectionGroups";

/**
 * Playfair at 900 for the section heading only. The root layout loads the
 * family up to 700. Not preloaded: section headings sit below the first
 * screen, and a preload put this file ahead of the fonts and photo the reader
 * sees first. The browser fetches it as soon as a heading is in the page.
 */
const playfairBlack = Playfair_Display({ weight: "900", subsets: ["latin"], display: "swap", preload: false });

const RULE =
  "h-[7px] min-w-[18px] flex-1 border-y-2 border-accent sm:h-[8px] sm:min-w-6 sm:border-y-[2.5px]";

/**
 * Opens a group of places in a single-type listicle: the editor's section
 * name in heavy Playfair capitals, centred between two double accent rules
 * (owner, 2026-11-15). Names are capped at 12 characters, so the heading stays
 * on one line on a phone.
 */
export function ListicleSectionHeading({
  title,
  id,
}: {
  title: string;
  id?: string;
}): JSX.Element {
  return (
    <h2 id={id} className="listicle-section-heading m-0 flex items-center gap-3 text-foreground">
      <span aria-hidden className={RULE} />
      <span
        className={`${playfairBlack.className} min-w-0 text-center text-[clamp(18px,4.6vw,26px)] font-black uppercase leading-[1.05] tracking-[0.01em] [text-wrap:balance]`}
      >
        {title}
      </span>
      <span aria-hidden className={RULE} />
    </h2>
  );
}

/** Rendered section headings, keyed by the zero-based start of the run each opens. */
export type ListicleSectionHeadings = Readonly<Record<number, JSX.Element>>;

/** Every section heading a listicle needs, keyed by where its run starts. */
export function renderListicleSectionHeadings(
  items: readonly { section?: string | null }[],
): ListicleSectionHeadings {
  const headings: Record<number, JSX.Element> = {};
  const ids = new Map(listicleSectionAnchors(items).map((anchor) => [anchor.start, anchor.id]));
  for (const run of groupListicleItemsBySection(items)) {
    if (!run.section) continue;
    headings[run.start] = <ListicleSectionHeading id={ids.get(run.start)} title={run.section} />;
  }
  return headings;
}
