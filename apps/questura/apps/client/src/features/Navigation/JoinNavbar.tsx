import Link from "@/components/navigation/PublicLink";
import Logo from "./shared/components/Logo";

/**
 * Minimal navbar for the /join funnel: just the wordmark linking home,
 * with none of the menu/auth/subscribe chrome from the main Navbar.
 */
export default function JoinNavbar() {
  return (
    <nav className="sticky top-0 z-40 flex h-[55px] w-full items-center justify-center bg-[#031522] 1024:h-16">
      {/* No prefetch: on a slow phone the home page's photos used to download
          while the reader was still on /join (2026-11-22, 133 kB). */}
      <Link
        href="/"
        prefetch={false}
        data-no-hover-underline
        aria-label="Questurian home"
        className="flex cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#78C7E8]"
      >
        <Logo
          variant="inline"
          className="whitespace-nowrap !text-[#F4F0E7] text-[1.35rem] [--wordmark-tracking:0.08em] 1024:text-[1.6rem]"
        />
      </Link>
    </nav>
  );
}
