import type { JSX } from "react";

import type {
  DestinationHeaderBlock,
  EditorialFeatureImage,
  HomepageBlockLayoutProps,
} from "../../../types";
import CountryFlag from "@/components/shared/ui/CountryFlag";
import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_IMAGE_SIZES } from "../blockImageSizes";
import { BlockSection } from "../BlockSection";
import { heroImagePriority } from "../heroImagePriority";

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

function ready(image: EditorialFeatureImage | null | undefined) {
  return image?.url && (!image.status || image.status === "ready")
    ? image
    : null;
}

/**
 * Opens a destination page. Three layouts, all inside the page margins:
 * `band` puts a short photo strip above a centred flag, name and description;
 * `split` puts the text on the left and the photo on the right (photo first
 * on phones); `editorial` centres a magazine-proportion photo above the text.
 * The country flag stands in for a breadcrumb. The editor-chosen focus keeps
 * the same part of the photo in view at every size. The title is an <h2>
 * because the page already carries its one (visually hidden) <h1>.
 */
export function DestinationHeaderPreview({
  block,
  location,
  blockIndex,
}: HomepageBlockLayoutProps<DestinationHeaderBlock>): JSX.Element | null {
  const layout =
    block.destinationLayout === "split" ||
    block.destinationLayout === "editorial"
      ? block.destinationLayout
      : "band";
  const hero = block.destinationImage?.url ? block.destinationImage : null;
  const image =
    layout === "editorial" ? (ready(block.destinationImageEditorial) ?? hero) : hero;
  const body = paragraphs(block.destinationDescription);
  if (!block.sectionHeading && !image && body.length === 0) return null;

  const centred = layout !== "split";
  const objectPosition = `${focus(block.destinationFocusX)}% ${focus(block.destinationFocusY)}%`;

  const photoFrame =
    layout === "split"
      ? "order-first h-[220px] overflow-hidden bg-paper 768:order-none 768:h-[440px]"
      : layout === "editorial"
        ? "mx-auto aspect-[3/2] w-full max-w-[720px] overflow-hidden bg-paper"
        : "h-[200px] overflow-hidden bg-paper 768:h-[340px]";
  const sizes =
    layout === "split"
      ? BLOCK_IMAGE_SIZES.destinationSplit
      : layout === "editorial"
        ? BLOCK_IMAGE_SIZES.destinationEditorial
        : BLOCK_IMAGE_SIZES.pageHero;

  const photo = image ? (
    <div className={photoFrame}>
      <PublicImage
        src={image.url}
        alt={image.alt ?? ""}
        className="h-full w-full object-cover"
        style={{ objectPosition }}
        {...heroImagePriority(blockIndex)}
        sizes={sizes}
      />
    </div>
  ) : null;

  const text = (
    <div className={centred ? "mx-auto max-w-[40rem] text-center" : undefined}>
      {location?.countryCode ? (
        <CountryFlag
          code={location.countryCode}
          countryName={location.countryName ?? undefined}
          className="h-[18px] w-[27px] 768:h-[20px] 768:w-[30px]"
        />
      ) : null}
      {block.sectionHeading ? (
        <h2
          className={`mt-3 font-display font-normal leading-[1.05] text-foreground ${
            centred
              ? "text-[2.375rem] 768:text-[2.875rem]"
              : "text-[2.625rem] 768:text-[3.5rem]"
          }`}
        >
          {block.sectionHeading}
        </h2>
      ) : null}
      {body.map((paragraph, index) => (
        <p
          key={index}
          className={`${index === 0 ? "mt-3" : "mt-2.5"} font-editorial text-[1.0625rem] font-medium leading-[1.5] text-foreground/80 768:text-[1.125rem]`}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );

  if (layout === "split") {
    return (
      <BlockSection
        aria-label={block.sectionHeading ?? undefined}
        className="bg-background pb-4 pt-4 768:pb-6 768:pt-9"
      >
        <div className="grid grid-cols-1 items-center gap-5 768:grid-cols-[1fr_1.15fr] 768:gap-12">
          {text}
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
      <div className="pt-6 768:pt-7">{text}</div>
    </BlockSection>
  );
}
