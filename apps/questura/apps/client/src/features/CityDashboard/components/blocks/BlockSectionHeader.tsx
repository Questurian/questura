import type { JSX } from 'react'

import { BLOCK_TYPE } from './blockType'

type BlockSectionHeaderProps = {
  heading: string
  subheading?: string | null
  /** Wrapper classes: geometry and spacing only, never type. */
  className?: string
  /** Colour overrides for dark blocks (Tailwind utilities beat the type layer). */
  headingClassName?: string
  subheadingClassName?: string
}

/** Block heading + optional subheading, in the shared block type styles. */
export function BlockSectionHeader({
  heading,
  subheading,
  className,
  headingClassName,
  subheadingClassName,
}: BlockSectionHeaderProps): JSX.Element {
  return (
    <div className={className}>
      <h2 className={headingClassName ? `${BLOCK_TYPE.sectionHeading} ${headingClassName}` : BLOCK_TYPE.sectionHeading}>
        {heading}
      </h2>
      {subheading ? (
        <p
          className={
            subheadingClassName
              ? `${BLOCK_TYPE.sectionSubheading} ${subheadingClassName}`
              : BLOCK_TYPE.sectionSubheading
          }
        >
          {subheading}
        </p>
      ) : null}
    </div>
  )
}
