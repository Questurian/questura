import type { CSSProperties, JSX } from 'react'

import { BlockSection } from '@/features/CityDashboard/components/blocks/BlockSection'

import { BANNER_TYPE } from './bannerFont'
import type { SectionPageCopy } from './lib/sectionPages'
import { SectionPhotoStack } from './SectionPhotoStack'

/** Average advance of a narrow Archivo extrabold capital plus its tracking, rounded up. */
const NAME_ADVANCE_EM = 0.6

/**
 * The name is the same size on every section page (EAT, STAY, ITINERARIES)
 * unless the word cannot fit 85% of the pile's width, as ITINERARIES cannot
 * on a phone.
 */
function nameSize(name: string): CSSProperties {
  const ems = (name.length * NAME_ADVANCE_EM).toFixed(2)
  return {
    fontSize: `min(10rem, 26vw, calc((min(100vw, var(--block-max-width)) - 2 * var(--block-gutter)) * 0.85 / ${ems}))`,
  }
}

/**
 * A section page's masthead (Eat, Stay, Itineraries): a pile of photo prints
 * that shuffles (SectionPhotoStack), with the Questurian wordmark and the
 * section's name set big over it in the banner face.
 */
export function SectionMasthead({
  copy,
  photos,
}: {
  copy: SectionPageCopy
  photos: readonly string[]
}): JSX.Element {
  return (
    <BlockSection className="overflow-x-clip" contentClassName="pt-8 pb-8 768:pt-12 768:pb-12">
      <header>
        <SectionPhotoStack photos={photos}>
          <span
            aria-hidden="true"
            className="font-[family-name:var(--font-display)] text-[1.3rem] font-bold leading-none tracking-[-0.02em] text-background [text-shadow:0_1px_18px_rgb(26_26_26/0.35)] 768:text-[1.75rem] 1024:text-[2.2rem]"
          >
            Questurian
          </span>
          <h1
            id="section-page-title"
            className={`mt-1 ${BANNER_TYPE} leading-[0.9] tracking-[0.02em] text-background [text-shadow:0_2px_30px_rgb(26_26_26/0.4)] 768:mt-2`}
            style={nameSize(copy.name)}
          >
            {copy.name}
          </h1>
        </SectionPhotoStack>
      </header>
    </BlockSection>
  )
}
