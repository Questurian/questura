import type { JSX } from "react";

import type {
  CityHomepageLocation,
  DestinationHeaderBlock,
  HomepageBlockLayoutProps,
} from "../../../types";
import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_IMAGE_SIZES } from "../blockImageSizes";
import { BLOCK_GUTTER_CLASS } from "../BlockSection";
import { heroImagePriority } from "../heroImagePriority";

/**
 * The trail over the title: "Destinations", then each place above this one.
 * Plain text: there is no destinations index or country page to link to yet.
 */
export function destinationBreadcrumb(
  location: CityHomepageLocation | null,
): string[] {
  if (!location) return [];
  const trail = ["Destinations"];
  const level = location.level;
  if ((level === "city" || level === "neighborhood") && location.countryName) {
    trail.push(location.countryName);
  }
  if (level === "neighborhood" && location.cityName) {
    trail.push(location.cityName);
  }
  return trail;
}

/** Paragraphs are separated by a blank line in the stored text. */
function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Opens a destination page: one photo edge to edge, then a centred
 * breadcrumb, the destination's name and a paragraph about it. The title is
 * an <h2> because the page already carries its one (visually hidden) <h1>.
 */
export function DestinationHeaderPreview({
  block,
  location,
  blockIndex,
}: HomepageBlockLayoutProps<DestinationHeaderBlock>): JSX.Element | null {
  const image = block.destinationImage?.url ? block.destinationImage : null;
  const body = paragraphs(block.destinationDescription);
  if (!block.sectionHeading && !image && body.length === 0) return null;

  const trail = destinationBreadcrumb(location);

  return (
    <section
      aria-label={block.sectionHeading ?? undefined}
      className="relative bg-background"
    >
      {image ? (
        <div className="aspect-[4/3] max-h-[78vh] w-full overflow-hidden bg-paper 768:aspect-[21/9]">
          <PublicImage
            src={image.url}
            alt={image.alt ?? ""}
            className="h-full w-full object-cover"
            {...heroImagePriority(blockIndex)}
            sizes={BLOCK_IMAGE_SIZES.fullBleed}
          />
        </div>
      ) : null}
      <div
        className={`mx-auto w-full max-w-[60rem] pb-10 pt-7 text-center 768:pb-14 768:pt-9 ${BLOCK_GUTTER_CLASS}`}
      >
        {trail.length > 0 ? (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center justify-center gap-x-2 font-sans text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-foreground">
              {trail.map((crumb, index) => (
                <li key={`${crumb}-${index}`} className="flex items-center gap-x-2">
                  {index > 0 ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 8 12"
                      className="h-[0.7rem] w-[0.45rem] text-foreground/70"
                    >
                      <path
                        d="M1.5 1l5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  ) : null}
                  <span>{crumb}</span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {block.sectionHeading ? (
          <h2 className="mt-4 font-display text-[2.75rem] font-normal leading-[1.05] text-foreground 768:mt-5 768:text-[3.5rem]">
            {block.sectionHeading}
          </h2>
        ) : null}
        {body.map((paragraph, index) => (
          <p
            key={index}
            className={`${index === 0 ? "mt-4 768:mt-5" : "mt-3"} font-sans text-[1rem] leading-[1.65] text-foreground/85 768:text-[1.0625rem]`}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
