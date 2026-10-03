"use client";

import { User, ChevronDown } from "lucide-react";
import { useUserModalStore } from "@/lib/stores/userModalStore";

interface UserIconProps {
  buttonClassName?: string;
  isMember?: boolean;
}

export default function UserIcon({ buttonClassName = "", isMember = false }: UserIconProps) {
  const { openUserModal } = useUserModalStore();

  return (
    <button
      onClick={openUserModal}
      className={`group inline-flex shrink-0 cursor-pointer items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-nav-focus focus-visible:ring-offset-1 ${buttonClassName}`}
      aria-label="Open user menu"
    >
      <span className="flex h-8 items-center gap-2 rounded-full bg-nav-pill pl-[5px] pr-3.5 transition-colors duration-150 group-hover:bg-nav-pill-hover 480:h-10 480:pl-[6px] 480:pr-4">
        {isMember ? (
          <span
            className="relative flex h-[22px] w-[22px] shrink-0 rounded-full 480:h-[28px] 480:w-[28px]"
            // Dark behind the globe so its anti-aliased edge never shows a light hairline.
            style={{ background: '#04101E', boxShadow: '0 0 0 1px rgba(172,128,32,0.8)' }}
          >
            {/* A static file, not inline SVG: its path data is ~5 kB gzip, which would
                otherwise ride in every page's JS for every visitor; as a file only
                members fetch it, once. Regenerate it in the navbar lab
                (scripts/render-globe-mark.mjs), don't hand-edit it. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG; next/image adds no value and would route it through the optimizer. */}
            <img src="/images/globe-mark.svg" alt="" aria-hidden width={28} height={28} className="block h-full w-full" />
            <span
              aria-hidden
              className="absolute -right-[2px] -top-[2px] text-[5px] leading-none 480:-right-[3px] 480:-top-[3px] 480:text-[6px]"
              style={{ color: '#c8921e' }}
            >
              ✦
            </span>
          </span>
        ) : (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-nav-avatar-from to-nav-avatar-to ring-1 ring-nav-avatar-ring 480:h-[28px] 480:w-[28px]">
            <User
              aria-hidden
              strokeWidth={1.75}
              className="h-[9px] w-[9px] text-nav-avatar-glyph 480:h-[11px] 480:w-[11px]"
            />
          </span>
        )}
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className="h-[9px] w-[9px] shrink-0 text-nav-chevron 480:h-[10px] 480:w-[10px]"
        />
      </span>
    </button>
  );
}
