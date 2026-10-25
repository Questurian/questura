"use client";
import dynamic from "next/dynamic";
import { QueryProvider } from "./QueryProvider";
import type { LocationMenuResponse } from "@/features/Navigation/lib/fetchLocationMenu";
/**
 * Modal renderers load after a reader opens a navigation or account tool.
 * If one's code does not arrive, render nothing instead of throwing: a thrown
 * load reaches `app/error.tsx` and swaps the whole page for "Something went
 * wrong" over a modal nobody opened. Firefox does this on every fast
 * navigation, because it cancels the old page's pending scripts as soon as the
 * next page is requested (ChunkLoadError; e2e `errors.spec.ts`). The next page
 * load fetches the code again.
 */
const nothing = () => ({ default: () => null });

const LoginModalRenderer = dynamic(
  () => import("@/components/layout/LoginModalRenderer").catch(nothing),
  { ssr: false },
);
const PasswordResetModalRenderer = dynamic(
  () => import("@/components/layout/PasswordResetModalRenderer").catch(nothing),
  { ssr: false },
);
const UserModalRenderer = dynamic(
  () => import("@/components/layout/UserModalRenderer").catch(nothing),
  { ssr: false },
);
const MenuModalRenderer = dynamic(
  () => import("@/components/layout/MenuModalRenderer").catch(nothing),
  { ssr: false },
);

export default function InteractionModals({ locationMenu }: { locationMenu: LocationMenuResponse | null }) {
  return <QueryProvider><LoginModalRenderer /><PasswordResetModalRenderer /><UserModalRenderer /><MenuModalRenderer locationMenu={locationMenu} /></QueryProvider>;
}
