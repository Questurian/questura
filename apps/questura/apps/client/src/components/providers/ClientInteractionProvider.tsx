"use client";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { LocationMenuResponse } from "@/features/Navigation/lib/fetchLocationMenu";
import { useLoginModalStore } from "@/lib/stores/loginModalStore";
import { useMenuModalStore } from "@/lib/stores/menuModalStore";
import { useUserModalStore } from "@/lib/stores/userModalStore";
import { useResetPasswordModalStore } from "@/features/Auth/stores/resetPasswordModalStore";

const InteractionModals = lazy(() => import("./InteractionModals"));

/** Navigation is readable immediately; account tools load only when requested. */
export function ClientInteractionProvider({ children, modals = true, locationMenu = null }: {
  children: ReactNode;
  modals?: boolean;
  locationMenu?: LocationMenuResponse | null;
}) {
  const login = useLoginModalStore((state) => state.isOpen);
  const menu = useMenuModalStore((state) => state.isOpen || state.isWarm);
  const user = useUserModalStore((state) => state.isOpen);
  const reset = useResetPasswordModalStore((state) => state.isOpen);
  return <>{children}{modals && (login || menu || user || reset) ? <Suspense fallback={<p role="status" className="sr-only">Loading controls…</p>}><InteractionModals locationMenu={locationMenu} /></Suspense> : null}</>;
}
