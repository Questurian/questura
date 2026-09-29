'use client';

import { TextSearch } from 'lucide-react';
import { useMenuModalStore } from '@/lib/stores/menuModalStore';

interface MenuIconProps {
  buttonClassName?: string;
  iconClassName?: string;
  strokeWidth?: number;
}

export default function MenuIcon({ buttonClassName = '', iconClassName = '', strokeWidth = 1.5 }: MenuIconProps) {
  const { openMenuModal } = useMenuModalStore();

  return (
    <button
      onClick={openMenuModal}
      className={`inline-flex items-center justify-center p-0 leading-none bg-transparent border-0 cursor-pointer focus:outline-none ${buttonClassName}`}
      aria-label="Open menu modal"
    >
      <TextSearch
        aria-hidden
        strokeWidth={strokeWidth}
        className={`shrink-0 text-white cursor-pointer ${iconClassName}`}
      />
    </button>
  );
}
