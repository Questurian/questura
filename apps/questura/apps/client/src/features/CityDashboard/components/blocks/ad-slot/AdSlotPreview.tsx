import type { JSX } from "react";

import type { AdSlotBlock, HomepageBlockLayoutProps } from "../../../types";
import { BlockSection } from "../BlockSection";
import { InArticleAd } from "@/features/articles/components/InArticleAd";
import { isAdShapeOn } from "@/features/ads/lib/adUnits";

/**
 * An ad the editor placed between two homepage blocks.
 *
 * The same grammar as an ad in an article (`InArticleAd`): hairline, the
 * "Advertisement" label, the slot at its exact size, hairline. One look
 * site-wide is what tells a reader where our page stops and the ad starts.
 * Held to the page width like every block.
 *
 * Draws nothing when its size has no unit key yet (`features/ads/lib/adUnits.ts`),
 * so editors can place ad blocks before the ad account is set up.
 */
export function AdSlotPreview({
  block,
}: HomepageBlockLayoutProps<AdSlotBlock>): JSX.Element | null {
  const shape = block.adSize === "rectangle" ? "rectangle" : "banner";
  if (!isAdShapeOn(shape)) return null;

  return (
    <BlockSection contentClassName="py-6 768:py-8" aria-label="Advertisement">
      <InArticleAd slotId={`homepage-${block.id}`} variant={shape} />
    </BlockSection>
  );
}
