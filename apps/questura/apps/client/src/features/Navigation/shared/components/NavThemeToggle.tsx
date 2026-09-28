"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { readNavTheme, setNavTheme, type NavTheme } from "../../lib/navTheme";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/**
 * Light / dark switch for the navbar, shown at the foot of the menu. It
 * recolours the navbar only (lib/navTheme.ts). The menu is loaded in the
 * browser only (MenuModalRenderer, ssr: false), so reading the saved choice
 * during the first render is safe.
 */
export default function NavThemeToggle() {
  const [theme, setTheme] = useState<NavTheme>(() => readNavTheme());

  const choose = (next: NavTheme) => {
    setNavTheme(next);
    setTheme(next);
  };

  return (
    <div
      role="group"
      aria-label="Navbar colour"
      className="flex items-center gap-0.5 rounded-full border border-white/10 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => choose(value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
              active ? "bg-[#F5F0E8] text-[#16181b]" : "text-white/55 hover:text-white"
            }`}
          >
            <Icon aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
