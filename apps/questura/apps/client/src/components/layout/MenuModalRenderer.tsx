"use client";

import dynamic from 'next/dynamic';

import { useMenuModalStore } from '@/lib/stores/menuModalStore';
import type { LocationMenuResponse } from '@/features/Navigation/lib/fetchLocationMenu';

const MenuModal = dynamic(() => import('@/components/layout/MenuModal'), { ssr: false });

type MenuModalRendererProps = {
  locationMenu?: LocationMenuResponse | null;
};

export default function MenuModalRenderer({ locationMenu = null }: MenuModalRendererProps) {
  const { isOpen, isWarm, closeMenuModal } = useMenuModalStore();

  // With the menu data already in hand we know exactly which flags the modal
  // will ask for, so fetch them once the reader reaches for the menu button
  // (hover, focus or touch) rather than on the click. React hoists these into
  // <head>. A handful of ~1KB SVGs.
  //
  // Not at hydration: every page then downloaded five flags it never showed
  // (Questurian/questura#9). And `prefetch`, not `preload`: a reader who hovers
  // and moves on would otherwise get a "preloaded but not used" warning.
  const flagCodes = [
    ...new Set(
      (locationMenu?.countries ?? [])
        .map((country) => country.countryCode)
        .filter((code): code is string => Boolean(code)),
    ),
  ];

  return (
    <>
      {isWarm
        ? flagCodes.map((code) => (
            <link key={code} rel="prefetch" as="image" href={`/flags/${code}.svg`} />
          ))
        : null}
      {isOpen ? (
        <MenuModal isOpen onClose={closeMenuModal} initialLocationMenu={locationMenu} />
      ) : null}
    </>
  );
}
