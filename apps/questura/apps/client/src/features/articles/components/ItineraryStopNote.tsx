import type { JSX } from "react";
import { CircleAlert, Clock, Info, Ticket, type LucideIcon } from "lucide-react";
import { editorialBoxPaddingClass } from "@/features/articles/components/EditorialBox";
import { editorialKickerClass } from "@/features/articles/components/EditorialRule";
import { InlineMarkdown } from "@/features/articles/components/InlineMarkdown";
import type { ItineraryStopNote as StopNote } from "@/features/articles/types/itineraryListicle";

const ICONS: Record<NonNullable<StopNote["icon"]>, LucideIcon> = {
  clock: Clock,
  info: Info,
  ticket: Ticket,
  alert: CircleAlert,
};

const subheadClass =
  "font-[family-name:var(--font-dm-sans)] text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-foreground/60 sm:text-[11px]";

/**
 * A Stop Note (studio ADR 0048): practical information that is not a stop --
 * "Before tomorrow" under the last dinner of a day, "Getting home tonight".
 * Drawn inside the stop's entry in the same square paper box and blue kicker
 * as the Optional add-on (ItineraryActivityAddOn), with no photos, pin or
 * number. Its copy is plain text with inline markdown, like the other
 * editorial boxes.
 */
export function ItineraryStopNote({ note }: { note: StopNote }): JSX.Element {
  const Icon = ICONS[note.icon ?? "info"];
  const paragraphs = (note.body ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <aside
      aria-label={`${note.label}: ${note.title}`}
      className={`itinerary-stop-note bg-paper text-foreground ${editorialBoxPaddingClass} space-y-3 380:space-y-3.5 480:space-y-4 sm:space-y-5`}
    >
      <p className={`flex items-center gap-2 text-accent ${editorialKickerClass}`}>
        <Icon className="size-[15px] shrink-0 sm:size-4" strokeWidth={1.8} aria-hidden />
        {note.label}
      </p>

      <div className="space-y-1.5 sm:space-y-2">
        <h3 className="font-display text-[21px] font-bold leading-[1.25] sm:text-[24px]">
          {note.title}
        </h3>
        {note.subline ? (
          <p className="maps-listicle-meta-row">
            <span className="maps-listicle-meta-item">
              <span className="maps-listicle-meta-value">{note.subline}</span>
            </span>
          </p>
        ) : null}
      </div>

      {paragraphs.length ? (
        <div className="article-prose maps-listicle-blurb maps-listicle-venue-blurb max-w-none space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>
              <InlineMarkdown text={paragraph} />
            </p>
          ))}
        </div>
      ) : null}

      {note.timeline?.length ? (
        <div className="space-y-2.5">
        {note.timelineLabel ? <p className={subheadClass}>{note.timelineLabel}</p> : null}
        <ol className="m-0 list-none border-t border-foreground/15 p-0">
          {note.timeline.map((row, index) => (
            <li
              key={`${row.time}-${index}`}
              className="grid grid-cols-[4.25rem_1fr] gap-3 border-b border-foreground/15 py-2.5 font-display text-[16px] leading-[1.5] sm:text-[17px]"
            >
              <time className="pt-px font-[family-name:var(--font-dm-sans)] text-[14px] font-semibold text-accent">
                {row.time}
              </time>
              <span>
                <InlineMarkdown text={row.text} />
              </span>
            </li>
          ))}
        </ol>
        </div>
      ) : null}

      {note.checklist?.length ? (
        <div className="space-y-3">
        {note.checklistLabel ? <p className={subheadClass}>{note.checklistLabel}</p> : null}
        <ul className="m-0 list-none space-y-2 p-0">
          {note.checklist.map((line, index) => (
            <li
              key={index}
              className="relative pl-6 font-display text-[16px] leading-[1.5] sm:text-[17px]"
            >
              <span
                aria-hidden
                className="absolute left-0.5 top-[0.42em] size-[11px] border-[1.5px] border-accent"
              />
              <InlineMarkdown text={line} />
            </li>
          ))}
        </ul>
        </div>
      ) : null}
    </aside>
  );
}

/** Every note on one stop, in order. */
export function ItineraryStopNotes({ notes }: { notes?: StopNote[] }): JSX.Element | null {
  if (!notes?.length) return null;
  return (
    <>
      {notes.map((note, index) => (
        <ItineraryStopNote key={note.id ?? index} note={note} />
      ))}
    </>
  );
}

