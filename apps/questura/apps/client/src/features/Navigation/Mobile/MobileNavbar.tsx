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
    // 64px tall, with 40px tap targets. The menu glyph is drawn about as tall
    // as the wordmark's capitals and at a matching weight, so the two read as
    // one lockup. Sign in fills the width AuthSlot reserves, text centred,
    // instead of hugging the right edge and leaving a gap after Subscribe.
    <nav className="h-16 min-h-16 w-full border-b border-nav-rule-soft bg-nav-bg pl-2 pr-4 py-0 480:pl-3 480:pr-5 768:pl-5 768:pr-8">
      <div className="flex h-16 min-h-16 items-center justify-between gap-3">
        <div className="flex min-h-10 min-w-0 flex-1 items-center gap-0.5 480:gap-1.5">
          <MenuIcon
            buttonClassName="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            iconClassName="!text-nav-ink block h-[28px] w-[28px]"
            strokeWidth={1.75}
          />
          <Link
            href="/"
            data-no-hover-underline
            className="inline-flex min-w-0 cursor-pointer items-center self-center"
          >
            <Logo
              variant="inline"
              className="whitespace-nowrap font-bold leading-none text-[1.3rem] tracking-[-0.01em] 380:text-[1.4rem] 480:text-[1.6rem] 768:text-[1.75rem]"
            />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-3 480:gap-4">
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
          <AuthSlot
            loading={loading}
            isAuthenticated={isAuthenticated}
            isMember={isActive}
            signInClassName="!text-nav-ink !h-[30px] w-full px-2.5 !text-[0.8rem] !font-medium 480:!h-10 480:!text-[0.85rem]"
            userIconClassName="shrink-0"
          />
        </div>
      </div>
    </nav>
  );
}
