import type { ComponentType, ReactNode } from "react";

export type FooterLinkComponent = ComponentType<{ href: string; prefetch?: false; className?: string; children: ReactNode }>;
import Logo from "@/features/Navigation/shared/components/Logo";
import type { LocationMenuResponse } from "@/features/Navigation/lib/fetchLocationMenu";

/**
 * Site footer. It wears the navbar's palette: `.site-footer` sits beside
 * `.site-nav` in the dark-theme selector (foundations.css), so when a reader
 * switches the bar to dark the footer follows, and the page is framed by one
 * colour top and bottom.
 *
 * Layout follows a magazine footer: three link columns, a brand column, then
 * the affiliate disclosure and the legal line. Destinations come from the same
 * location menu as the navbar, so a country hidden from the menu is hidden
 * here too.
 */

type FooterLink = { label: string; href: string };

const EXPLORE_LINKS: FooterLink[] = [
  { label: "Eat", href: "/eat" },
  { label: "Stay", href: "/stay" },
  { label: "Itineraries", href: "/itineraries" },
  { label: "All articles", href: "/articles" },
];

const ABOUT_LINKS: FooterLink[] = [
  { label: "Newsletters", href: "/newsletters" },
  { label: "Membership", href: "/join" },
  { label: "FAQ", href: "/faq" },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function destinationLinks(menu: LocationMenuResponse | null): FooterLink[] {
  if (!menu) return [];
  return menu.countries.flatMap((country) =>
    country.cities.length > 0
      ? country.cities.map((city) => ({ label: city.label, href: city.href }))
      : [{ label: country.label, href: country.href }],
  );
}

function FooterColumn({ heading, links, Link }: { heading: string; links: FooterLink[]; Link: FooterLinkComponent }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-[0.75rem] font-bold uppercase leading-none tracking-[0.14em] text-nav-ink">
        {heading}
      </h2>
      <ul className="mt-5 space-y-3.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className="font-[family-name:var(--font-dm-sans)] text-[0.75rem] font-medium uppercase leading-none tracking-[0.12em] text-nav-link hover:text-nav-link-hover"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Every link here has `prefetch={false}`. Next prefetches a link's page as
 * soon as the link scrolls into view, and the footer now holds a dozen links
 * or more (destinations, sections, about, legal) at the end of every page, so
 * reaching the bottom of any page fetched a dozen other pages. On a slow
 * phone link that traffic queues in front of the page's own images (e2e
 * journey 12, Slow 3G: about 42 s before the bigger footer, 48 s after). A
 * click still navigates as a client-side transition; it just fetches then.
 */
export function FooterLayout({
  locationMenu = null,
  Link,
}: {
  locationMenu?: LocationMenuResponse | null;
  Link: FooterLinkComponent;
}) {
  const destinations = destinationLinks(locationMenu);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer w-full border-t border-nav-rule bg-nav-bg text-nav-ink">
      <div className="mx-auto w-full max-w-[var(--block-max-width)] px-[var(--block-gutter)] pb-8 pt-12 1024:pb-10 1024:pt-16">
        {/* From 768 the brand column (last track) is never narrower than its
            one-line newsletter button; the link columns give up the room. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 768:grid-cols-[repeat(3,minmax(0,1fr))_minmax(min-content,1fr)] 1024:gap-x-10">
          {/* Brand column: first on phones, last (right) from 768. */}
          <div className="col-span-2 768:order-last 768:col-span-1">
            {/* The wordmark's cap height sits 0.125em below its box top; the
                lift puts its caps on the column headings' cap line from 768. */}
            <Link
              href="/"
              prefetch={false}
              className="inline-flex text-[1.5rem] 768:-mt-[0.125em] 1024:text-[1.75rem]"
              data-no-hover-underline
            >
              <Logo variant="inline" className="text-[1em]" />
            </Link>
            <p className="mt-3 max-w-[22rem] font-[family-name:var(--font-editorial-serif)] text-[1.05rem] leading-snug text-nav-subtitle">
              Curated city guides, maps and itineraries across Latin America.
            </p>
            {/* One line wherever there is room; on a screen too narrow for
                that it wraps, centred, and grows taller instead of clipping. */}
            <Link
              href="/newsletters"
              prefetch={false}
              className="mt-5 inline-flex min-h-9 max-w-full items-center justify-center rounded-sm bg-accent px-4 py-2 text-center font-[family-name:var(--font-dm-sans)] text-[0.72rem] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#3150c7] 768:whitespace-nowrap"
            >
              Get the newsletter
            </Link>
          </div>

          {destinations.length > 0 ? (
            <FooterColumn Link={Link} heading="Destinations" links={destinations} />
          ) : null}
          <FooterColumn Link={Link} heading="Explore" links={EXPLORE_LINKS} />
          <FooterColumn Link={Link} heading="About" links={ABOUT_LINKS} />
        </div>

        {/* Affiliate disclosure. Required once affiliate links go live (FTC
            16 CFR 255); it is harmless before then. */}
        <div className="mt-12 border-t border-nav-rule pt-8 1024:mt-14">
          <p className="font-[family-name:var(--font-editorial-serif)] text-[1.15rem] font-semibold italic leading-tight text-nav-ink">
            Independent recommendations
          </p>
          <p className="mt-2 max-w-[48rem] font-[family-name:var(--font-editorial-serif)] text-[1rem] leading-relaxed text-nav-subtitle">
            Every place we recommend is chosen by our editors. Some links on Questurian are affiliate
            links: if you book or buy through them, we may earn a commission at no extra cost to you.
            It never decides what we write about.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-nav-rule pt-6 text-[0.75rem] text-nav-subtitle 768:flex-row 768:items-center 768:justify-between">
          <p>&copy; {year} Questurian. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className="font-semibold text-nav-link hover:text-nav-link-hover">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
