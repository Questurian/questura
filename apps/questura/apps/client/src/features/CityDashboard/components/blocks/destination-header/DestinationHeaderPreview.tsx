import type { JSX } from "react";

import type {
  CityHomepageLocation,
  DestinationHeaderBlock,
  HomepageBlockLayoutProps,
} from "../../../types";
import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_IMAGE_SIZES } from "../blockImageSizes";
import { BlockSection } from "../BlockSection";
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

function focus(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 50;
}

function Breadcrumb({
  trail,
  align,
}: {
  trail: string[];
  align: "center" | "start";
}) {
  if (trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol
        className={`flex flex-wrap items-center gap-x-2 font-sans text-[0.75rem] font-medium uppercase tracking-[0.1em] text-foreground ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        {trail.map((crumb, index) => (
          <li key={`${crumb}-${index}`} className="flex items-center gap-x-2">
            {index > 0 ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 8 12"
                className="h-[0.65rem] w-[0.42rem] text-foreground/70"
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
  );
}

/**
 * Opens a destination page. Two layouts, both inside the page margins:
 * `band` puts a short photo strip above a centred breadcrumb, name and
 * description; `split` puts the text on the left and the photo on the right
 * (photo first on phones). The editor-chosen focus keeps the same part of the
 * photo in view at every size. The title is an <h2> because the page already
 * carries its one (visually hidden) <h1>.
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
  const split = block.destinationLayout === "split";
  const objectPosition = `${focus(block.destinationFocusX)}% ${focus(block.destinationFocusY)}%`;

  const photo = image ? (
    <div
      className={
        split
          ? "order-first h-[220px] overflow-hidden bg-paper 768:order-none 768:h-[440px]"
          : "h-[200px] overflow-hidden bg-paper 768:h-[340px]"
      }
    >
      <PublicImage
        src={image.url}
        alt={image.alt ?? ""}
        className="h-full w-full object-cover"
        style={{ objectPosition }}
        {...heroImagePriority(blockIndex)}
        sizes={
          split ? BLOCK_IMAGE_SIZES.destinationSplit : BLOCK_IMAGE_SIZES.pageHero
        }
      />
    </div>
  ) : null;

  const description = body.map((paragraph, index) => (
    <p
      key={index}
      className={`${index === 0 ? "mt-3 768:mt-4" : "mt-3"} font-sans text-[0.9375rem] leading-[1.65] text-foreground/75 768:text-[0.96875rem]`}
    >
      {paragraph}
    </p>
  ));

  if (split) {
    return (
      <BlockSection
        aria-label={block.sectionHeading ?? undefined}
        className="bg-background pb-4 pt-4 768:pb-6 768:pt-9"
      >
        <div className="grid grid-cols-1 items-center gap-5 768:grid-cols-[1fr_1.15fr] 768:gap-12">
          <div>
            <Breadcrumb trail={trail} align="start" />
            {block.sectionHeading ? (
              <h2 className="mt-3 font-display text-[2.625rem] font-normal leading-[1.05] text-foreground 768:mt-4 768:text-[3.75rem]">
                {block.sectionHeading}
              </h2>
            ) : null}
            {description}
          </div>
          {photo}
        </div>
      </BlockSection>
    );
  }

  return (
    <BlockSection
      aria-label={block.sectionHeading ?? undefined}
      className="bg-background pb-4 pt-4 768:pb-6 768:pt-7"
    >
      {photo}
      <div className="mx-auto max-w-[44rem] pt-6 text-center 768:pt-7">
        <Breadcrumb trail={trail} align="center" />
        {block.sectionHeading ? (
          <h2 className="mt-3 font-display text-[2.375rem] font-normal leading-[1.05] text-foreground 768:mt-4 768:text-[2.875rem]">
            {block.sectionHeading}
          </h2>
        ) : null}
        {description}
      </div>
    </BlockSection>
  );
}
