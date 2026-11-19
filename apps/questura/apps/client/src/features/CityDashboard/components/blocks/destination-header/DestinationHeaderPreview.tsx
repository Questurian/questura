import type { CSSProperties, JSX } from "react";

import type {
  CityHomepageLocation,
  DestinationHeaderBlock,
  DestinationHeaderStyle,
  EditorialFeatureImage,
  HomepageBlockLayoutProps,
} from "../../../types";
import CountryFlag from "@/components/shared/ui/CountryFlag";
import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_IMAGE_SIZES } from "../blockImageSizes";
import {
  BLOCK_GUTTER_CLASS,
  BLOCK_MAX_WIDTH_CLASS,
  BlockSection,
} from "../BlockSection";
import { heroImagePriority } from "../heroImagePriority";
import { DESTINATION_HEADER_FONT_CLASS } from "./destinationHeaderFonts";
import { LevelWithName } from "./LevelWithName";
import {
  DEFAULT_DESTINATION_HEADER_STYLE,
  TEXT_METRICS,
  crumbCapHeight,
  crumbFlagWidth,
  levelPaddingTop,
  textWeight,
} from "./destinationHeaderMetrics";

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
 * "[flag] PERU › LIMA" above the name, in the description's font: small
 * tracked capitals, the city in full ink. The flag is exactly as tall as the
 * capitals and stands on their baseline, with a hairline edge so a white
 * stripe still reads against the paper; the chevron is the same height.
 */
function Crumb({
  location,
  name,
  style,
  className = "",
}: {
  location: CityHomepageLocation | null | undefined;
  name: string | null;
  style: DestinationHeaderStyle;
  className?: string;
}): JSX.Element | null {
  const country = location?.countryName?.trim();
  const city = (location?.cityName ?? name)?.trim();
  if (!country || !city) return null;
  const cap = crumbCapHeight(style);

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-baseline gap-[0.75em] text-[12px] font-medium uppercase leading-none tracking-[0.14em] text-foreground/70 ${DESTINATION_HEADER_FONT_CLASS[style.textFont]} ${className}`}
    >
      <span className="inline-flex items-baseline">
        {location?.countryCode ? (
          <span
            className="relative mr-[0.55em] flex shrink-0 after:absolute after:inset-0 after:shadow-[inset_0_0_0_0.5px_rgb(26_26_26/0.16)]"
            style={{ height: cap, width: crumbFlagWidth(style) }}
          >
            <CountryFlag code={location.countryCode} className="block h-full w-full" />
          </span>
        ) : null}
        <span>{country}</span>
      </span>
      <svg
        viewBox="0 0 6 10"
        aria-hidden="true"
        className="block shrink-0 overflow-visible"
        style={{ height: cap, width: cap * 0.6 }}
      >
        <path
          d="M1 1l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="text-foreground">{city}</span>
    </nav>
  );
}

/** The description's font, weight, size and colour from the shared style. */
function textProps(style: DestinationHeaderStyle): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: `${DESTINATION_HEADER_FONT_CLASS[style.textFont]} [text-wrap:pretty] ${style.textTone === "ink" ? "text-foreground" : "text-foreground/70"}`,
    style: {
      fontSize: `${style.textSize}px`,
      fontWeight: textWeight(style),
      lineHeight: TEXT_METRICS[style.textFont].lineHeight,
    },
  };
}

/**
 * Opens a destination page. Three layouts, all inside the page margins:
 * `band` puts a photo strip above the flag and name (left) and the
 * description (right; all stacked on the left edge on phones). The
 * strip keeps one 7:2 shape from tablets up (never under 200px tall, so phones
 * get a taller crop), which is the shape the editor's drag frame shows. The
 * space under the block is larger than any gap inside it, so the header reads
 * as one unit apart from the next block; the text column holds ~70 characters
 * a line, since centred lines any longer turn ragged;
 * `split` puts the text on the left and the photo on the right (photo first
 * on phones); `editorial` centres a magazine-proportion photo above the text;
 * `full` runs the photo edge to edge across the screen above the same text.
 * A small "[flag] PERU › LIMA" crumb sits above the name. The description's
 * font, weight, size, colour and (band, full) position come from the one
 * shared Destination Header style. The editor-chosen focus keeps
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
    block.destinationLayout === "editorial" ||
    block.destinationLayout === "full"
      ? block.destinationLayout
      : "band";
  const hero = block.destinationImage?.url ? block.destinationImage : null;
  const image =
    layout === "editorial" ? (ready(block.destinationImageEditorial) ?? hero) : hero;
  const body = paragraphs(block.destinationDescription);
  if (!block.sectionHeading && !image && body.length === 0) return null;

  const objectPosition = `${focus(block.destinationFocusX)}% ${focus(block.destinationFocusY)}%`;
  const style = block.destinationStyle ?? DEFAULT_DESTINATION_HEADER_STYLE;
  const text = textProps(style);
  const crumb = (className?: string) => (
    <Crumb
      location={location}
      name={block.sectionHeading}
      style={style}
      className={className}
    />
  );

  // `full` is the original edge-to-edge photo: 4:3 on phones, 21:9 (the
  // hero crop's own shape) from tablets up, never taller than 78% of the
  // screen so the name still shows on a short laptop.
  const photoFrame =
    layout === "editorial"
      ? "mx-auto aspect-[3/2] w-full max-w-[720px] overflow-hidden bg-paper"
      : layout === "full"
        ? "aspect-[4/3] max-h-[78vh] w-full overflow-hidden bg-paper 768:aspect-[21/9]"
        : "aspect-[7/2] min-h-[200px] w-full overflow-hidden bg-paper";
  const sizes =
    layout === "editorial"
      ? BLOCK_IMAGE_SIZES.destinationEditorial
      : layout === "full"
        ? BLOCK_IMAGE_SIZES.fullBleed
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

  const centredText = (
    <div className="mx-auto max-w-[32rem] text-center">
      {crumb("mb-3.5 justify-center")}
      {block.sectionHeading ? (
        <h2 className="font-display text-[2.375rem] font-normal leading-none text-foreground 768:text-[2.875rem]">
          {block.sectionHeading}
        </h2>
      ) : null}
      {body.map((paragraph, index) => (
        <p
          key={index}
          className={`${index === 0 ? "mt-4" : "mt-3"} ${text.className}`}
          style={text.style}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );

  // Band and full width: crumb and name on the left, paragraph on the
  // right. "top" starts its first capitals on the name's cap line (the
  // padding is worked out from the fonts' measured metrics); "centre" centres
  // it on crumb and name together. Phones stack all three on the left edge.
  const level = style.textAlign !== "centre";
  const sideText = (
    <div className="768:grid 768:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] 768:grid-rows-[auto_auto] 768:gap-x-8 1024:gap-x-12">
      {crumb("768:col-start-1 768:row-start-1")}
      {block.sectionHeading ? (
        <h2 className="mt-3.5 font-display text-[2.375rem] font-normal leading-none text-foreground 768:col-start-1 768:row-start-2 768:text-[2.875rem]">
          {block.sectionHeading}
        </h2>
      ) : null}
      {level ? (
        <LevelWithName
          className="mt-4 max-w-[34rem] 768:col-start-2 768:row-start-2 768:mt-0 768:pt-[var(--dh-level)]"
          style={{ "--dh-level": `${levelPaddingTop(style)}px` } as CSSProperties}
          padding={levelPaddingTop(style)}
        >
          {body.map((paragraph, index) => (
          <p
            key={index}
            className={`${index === 0 ? "" : "mt-3"} ${text.className}`}
            style={text.style}
          >
            {paragraph}
          </p>
        ))}
        </LevelWithName>
      ) : (
        <div className="mt-4 max-w-[34rem] 768:col-start-2 768:row-span-2 768:row-start-1 768:mt-0 768:self-center">
          {body.map((paragraph, index) => (
          <p
            key={index}
            className={`${index === 0 ? "" : "mt-3"} ${text.className}`}
            style={text.style}
          >
            {paragraph}
          </p>
        ))}
        </div>
      )}
    </div>
  );
  const textBlock = layout === "editorial" ? centredText : sideText;

  if (layout === "split") {
    // Side by side only from 1024px: narrower, the paragraph turns into a
    // tall ribbon beside a box of photo. Below that the photo leads, full
    // width, and the text follows.
    //
    // Wide, the photo stretches to the text column's height (min 440px), so
    // the photo's top meets the flag and its bottom meets the last line's
    // baseline (the -mb pulls the line box's half-leading and descent below
    // the edge). A text shorter than the 320px minimum is centred instead.
    return (
      <BlockSection
        aria-label={block.sectionHeading ?? undefined}
        className="bg-background pb-8 pt-5 768:pt-8 1024:pb-10 1024:pt-10"
      >
        <div className="flex flex-col gap-6 768:gap-8 1024:grid 1024:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] 1024:items-stretch 1024:gap-14 1280:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] 1280:gap-16">
          <div className="flex flex-col 1024:justify-center">
            {crumb()}
            {block.sectionHeading ? (
              <h2 className="mt-3.5 font-display text-[2.625rem] font-normal leading-none text-foreground 768:text-[3rem] 1280:text-[3.375rem]">
                {block.sectionHeading}
              </h2>
            ) : null}
            <div className="max-w-[36rem] 1024:-mb-[0.45em] 1024:max-w-none">
              {body.map((paragraph, index) => (
                <p
                  key={index}
                  className={`${index === 0 ? "mt-4" : "mt-3"} ${text.className}`}
                  style={text.style}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          {image ? (
            <div className="relative order-first aspect-[4/3] w-full overflow-hidden bg-paper 640:aspect-[16/9] 1024:order-none 1024:aspect-auto 1024:min-h-[320px]">
              <PublicImage
                src={image.url}
                alt={image.alt ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition }}
                {...heroImagePriority(blockIndex)}
                sizes={BLOCK_IMAGE_SIZES.destinationSplit}
              />
            </div>
          ) : null}
        </div>
      </BlockSection>
    );
  }

  if (layout === "full") {
    // Outside BlockSection: the photo runs past the 1400px content width to
    // both edges of the screen. The text keeps the page gutter.
    return (
      <section
        aria-label={block.sectionHeading ?? undefined}
        className="relative bg-background pb-10 768:pb-14"
      >
        {photo}
        <div
          className={`pt-7 768:pt-9 ${BLOCK_MAX_WIDTH_CLASS} ${BLOCK_GUTTER_CLASS}`}
        >
          {textBlock}
        </div>
      </section>
    );
  }

  return (
    <BlockSection
      aria-label={block.sectionHeading ?? undefined}
      className="bg-background pb-10 pt-4 768:pb-14 768:pt-7"
    >
      {photo}
      <div className="pt-6 768:pt-8">{textBlock}</div>
    </BlockSection>
  );
}
