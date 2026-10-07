"use client";

import { AuthSlot, Logo, MenuIcon, SubscribeButton } from "./components";
import Link from "@/components/navigation/PublicLink";
import { useAuth } from "@/lib/user/hooks";
import { useMembership } from "@/features/Payments/hooks/useMembership";

export default function MobileNavbar() {
  const { user, loading, isAuthenticated } = useAuth();
  const { isActive } = useMembership(user);
  const shouldShowSubscribe = !isAuthenticated || !isActive;

  return (
    // 64px tall, phones through tablets (below 1024). Everything is laid out
    // from what is drawn, not from the boxes around it, on two rules:
    //
    // 1. One horizontal axis. The bar's centre line runs through the middle of
    //    the menu glyph, the middle of the wordmark and the middle of both
    //    buttons. The wordmark's box is centred by the browser on its
    //    ascender-to-descender height, which is not where its ink is, so it is
    //    lifted until its lowercase band (x-height line to baseline) is centred
    //    on the axis. At that point its whole ink, from the top of the Q to the
    //    bottom of the Q's tail, is centred on the axis too.
    // 2. Shared lines. The menu glyph is drawn exactly as tall as that
    //    lowercase band, so its top bar is level with the tops of the
    //    lowercase letters and its bottom bar sits on the baseline. Both scale
    //    from one font-size, set on the wrapper.
    //
    // The side gutters are measured the same way: the glyph's left edge and
    // the right-hand control's right edge sit on the page's own 24px gutter,
    // so the bar lines up with the headline and images under it. Below 360
    // there is no room for that and it drops to 16px.
    //
    // Playfair Display in a line-height:1 box: the baseline is 0.4155em below
    // the box's centre and the x-height is 0.514em, so the lowercase band's
    // centre is 0.1585em below the box's centre. lucide's TextSearch draws
    // from y=5 to y=19 of 24 plus its stroke, so at 0.748em with a 2.5 stroke
    // it is 0.514em tall and 0.639em wide.
    <nav className="h-16 min-h-16 w-full border-b border-nav-rule-soft bg-nav-bg px-4 py-0 min-[360px]:px-6">
      <div className="flex h-16 min-h-16 items-center justify-between gap-2">
        <div className="flex min-h-10 min-w-0 flex-1 items-center gap-[0.55em] text-[1.3rem] 380:text-[1.4rem] 480:gap-[0.7em] 480:text-[1.6rem] 768:text-[1.75rem]">
          <MenuIcon
            // A 40px tap target around a glyph that is 0.639em wide. The
            // negative margins pull the spare tap area out of the layout, so
            // the gutter and the gap to the wordmark are measured from ink.
            buttonClassName="-mx-[calc((2.5rem-0.639em)/2)] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            iconClassName="!text-nav-ink block h-[0.748em] w-[0.748em]"
            strokeWidth={2.5}
          />
          <Link
            href="/"
            data-no-hover-underline
            className="inline-flex min-w-0 cursor-pointer items-center self-center"
          >
            <Logo
              variant="inline"
              className="relative -top-[0.1585em] whitespace-nowrap font-bold leading-none [--wordmark-tracking:-0.01em]"
            />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 380:gap-3 480:gap-4">
          {/* Public purchase link must not wait for the session request.
              While pending, the pre-paint hint hides it for members. */}
          {(loading || shouldShowSubscribe) ? (
            <Link
              href="/join"
              className="nav-subscribe flex h-8 items-center max-[379.98px]:h-auto"
              data-pending={loading || undefined}
            >
              <SubscribeButton />
            </Link>
          ) : null}
          {/* Sign in is an outlined button the size of the slot AuthSlot
              reserves, and the same height and type size as Subscribe beside
              it. As bare text it sat centred in that slot with dead space on
              both sides, so the bar's right margin was 12px wider than its
              left and changed again once the account menu replaced it. */}
          <AuthSlot
            loading={loading}
            isAuthenticated={isAuthenticated}
            isMember={isActive}
            signInClassName="!text-nav-ink !h-[30px] w-full rounded-[3px] border border-nav-ink/25 px-2 !text-[0.72rem] !font-medium transition-colors hover:!no-underline hover:!opacity-100 hover:bg-nav-pill 480:!h-10 480:!text-[0.85rem]"
            userIconClassName="shrink-0"
          />
        </div>
      </div>
    </nav>
  );
}
