"use client";

import dynamic from "next/dynamic";

/**
 * Developer tools for `pnpm dev` only. `process.env.NODE_ENV` is replaced at
 * build time, so in the live build this is `null` and the switcher module is
 * never bundled (`devToolsAreNotInTheLiveBuild.test.mjs` holds that).
 */
const DevMembershipSwitcher =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./DevMembershipSwitcher"), { ssr: false })
    : null;

export default function DevTools() {
  return DevMembershipSwitcher ? <DevMembershipSwitcher /> : null;
}
