import { lazy, Suspense, type JSX } from "react";
import { ArrowUp, CirclePlus } from "lucide-react";
const InstagramEmbedBlock = lazy(() => import("./InstagramEmbedBlock").then((module) => ({ default: module.InstagramEmbedBlock })));
import { editorialBoxPaddingClass } from "@/features/articles/components/EditorialBox";
import { editorialKickerClass } from "@/features/articles/components/EditorialRule";
import { useListicleMapSync } from "@/features/articles/components/ListicleMapSync";
import { ListiclePhotoCarousel } from "@/features/articles/components/ListiclePhotoCarousel";
import { ListicleTourPicks } from "@/features/articles/components/ListicleTourPicks";
import { ListicleVenueTitleRow } from "@/features/articles/components/ListicleVenueTitleRow";
import { listicleItemImagesFromRow } from "@/features/articles/lib/listicleItemHelpers";
import { listicleInstagramEmbedCode } from "@/features/articles/lib/listicleInstagram";
import type { ListicleItemRow } from "@/features/articles/types/mapsListicle";

/**
 * Something you can do while you are at the stop above (ADR 0047): paragliding
 * off the cliff by Love Park. It is drawn inside that stop's entry, in the
 * page's square paper box, so it reads as part of the visit and not as a stop
 * of its own. It shares the place's pin, and "At <place>" leads back up to it.
 */
export function ItineraryActivityAddOn({
  row,
  parentId,
}: {
  row: ListicleItemRow;
  /** The place's entry, which the "At <place>" line scrolls back to. */
  parentId: string;
}): JSX.Element {
  const { scrollToEntry } = useListicleMapSync();
  const title = row.activityTitle ?? row.item.title;
  const images = listicleItemImagesFromRow(row);
  const instagramCode = listicleInstagramEmbedCode(row);

  return (
    <section
      aria-label={`Optional add-on: ${title}`}
      className={`itinerary-activity-add-on bg-paper text-foreground ${editorialBoxPaddingClass} space-y-3 380:space-y-3.5 480:space-y-4 sm:space-y-5`}
    >
      <p className={`flex items-center gap-2 text-accent ${editorialKickerClass}`}>
        <CirclePlus className="size-[15px] shrink-0 sm:size-4" strokeWidth={1.8} aria-hidden />
        Optional add-on
      </p>

      <ListiclePhotoCarousel images={images} autoAdvance={false} />

      <div className="space-y-2 480:space-y-2.5 sm:space-y-3">
        <ListicleVenueTitleRow title={title} headingLevel={3} />
        <p className="maps-listicle-meta-row">
          <button
            type="button"
            onClick={() => scrollToEntry(parentId)}
            className="maps-listicle-meta-item inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left hover:text-accent"
          >
            <span className="maps-listicle-meta-value">At {row.item.title}</span>
            <ArrowUp className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          </button>
        </p>
      </div>

      {row.blurb ? (
        <div
          className="article-prose maps-listicle-blurb maps-listicle-venue-blurb max-w-none pb-1"
          dangerouslySetInnerHTML={{ __html: row.blurb }}
        />
      ) : null}

      <ListicleTourPicks tours={row.tours} />

      {instagramCode ? (
        <div className="-mx-1 flex w-full min-w-0 justify-center pt-1 480:pt-2 sm:pt-3">
          <Suspense fallback={<div aria-hidden className="min-h-[600px] w-full bg-background" />}>
            <InstagramEmbedBlock
              embedCode={instagramCode}
              captionMode="hide"
              className="w-full max-w-[540px]"
            />
          </Suspense>
        </div>
      ) : null}
    </section>
  );
}
