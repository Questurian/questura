import type { JSX } from "react";

import type { HomepageBlockLayoutProps, PageHeroBlock } from "../../../types";
import { BlockSection } from "../BlockSection";
import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_IMAGE_SIZES } from "../blockImageSizes";
import { heroImagePriority } from "../heroImagePriority";

/**
 * A page-opening banner: a large title, one italic supporting line, then a
 * wide photo across the content column. The title is an <h2> because the
 * page already carries its one (visually hidden) <h1>.
 */
export function PageHeroPreview({
  block,
  blockIndex,
}: HomepageBlockLayoutProps<PageHeroBlock>): JSX.Element | null {
  const image = block.heroImage?.url ? block.heroImage : null;
  if (!block.sectionHeading && !image) return null;

  return (
    <BlockSection
      aria-label={block.sectionHeading ?? undefined}
      className="bg-background py-8 768:py-10"
    >
      {block.sectionHeading ? (
        <h2 className="font-display text-[3rem] font-bold leading-[1.02] text-foreground 768:text-[4.25rem] 1024:text-[5rem]">
          {block.sectionHeading}
        </h2>
      ) : null}
      {block.sectionSubheading ? (
        <p className="mt-3 max-w-[30rem] font-editorial text-[1.05rem] italic leading-[1.5] text-foreground/70 768:text-[1.15rem]">
          {block.sectionSubheading}
        </p>
      ) : null}
      {image ? (
        <div className="mt-6 aspect-[16/10] overflow-hidden rounded-[2px] bg-paper 768:mt-8 768:aspect-[21/9]">
          <PublicImage
            src={image.url}
            alt={image.alt ?? ""}
            className="h-full w-full object-cover"
            {...heroImagePriority(blockIndex)}
            sizes={BLOCK_IMAGE_SIZES.pageHero}
          />
        </div>
      ) : null}
    </BlockSection>
  );
}
