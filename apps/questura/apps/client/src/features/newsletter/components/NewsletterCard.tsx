"use client";

import { useState, type JSX } from "react";

import { PublicImage } from "@/components/media/PublicImage";
import { BLOCK_TYPE } from "@/features/CityDashboard/components/blocks/blockType";
import type { NewsletterSignupSource } from "../services/newsletter.service";
import { LazyNewsletterSignupForm as NewsletterSignupForm } from "./LazyNewsletterSignupForm";

export type NewsletterListing = {
  name: string;
  /** "Monthly", "Weekly": the kicker over the name. */
  frequency: string;
  description: string;
  image: string;
  source: NewsletterSignupSource;
};

/**
 * One newsletter on /newsletters, in the shape every publisher's newsletter
 * page uses: art, frequency, name, a line, and a Sign up button. The button
 * opens the email form in place.
 */
export function NewsletterCard({ newsletter }: { newsletter: NewsletterListing }): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <article className="flex flex-col bg-paper">
      {/* Same duotone as the homepage newsletter block, so the two read as one product. */}
      <div className="relative aspect-[3/2] overflow-hidden" aria-hidden="true">
        <PublicImage
          src={newsletter.image}
          alt=""
          loading="eager"
          className="h-full w-full object-cover grayscale contrast-125"
          sizes="(min-width: 1024px) 440px, (min-width: 768px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-[#16226B] mix-blend-screen" />
        <div className="absolute inset-0 bg-accent/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[#16226B]/45" />
        <p className="absolute bottom-4 left-5 font-display text-[1.7rem] font-medium leading-none tracking-[-0.02em] text-background 768:text-[1.9rem]">
          Questurian
        </p>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-5 768:px-6 768:pb-7">
        <p className={BLOCK_TYPE.kicker}>{newsletter.frequency}</p>
        <h3 className="mt-3 font-display text-[1.45rem] font-medium leading-[1.1] tracking-[-0.01em] text-foreground 768:text-[1.55rem]">
          {newsletter.name}
        </h3>
        <p className="mt-2.5 font-[family-name:var(--font-editorial-serif)] text-[1.02rem] leading-[1.45] text-foreground/75">
          {newsletter.description}
        </p>

        <div className="mt-auto pt-6">
          {open ? (
            <NewsletterSignupForm source={newsletter.source} tone="light" autoFocus />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-[44px] border border-accent px-6 font-[family-name:var(--font-dm-sans)] text-[0.9rem] font-semibold text-accent transition-colors hover:bg-accent hover:text-background"
            >
              Sign up
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
