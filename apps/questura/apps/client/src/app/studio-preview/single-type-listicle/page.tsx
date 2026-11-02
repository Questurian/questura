import "../../styles/public-routes.css";

import type { Metadata } from "next";

import { SiteFonts } from "@/components/layout/SiteFonts";
import { renderEveryListicleMomentHeading } from "@/features/articles/components/ListicleMomentHeading";
import { StudioListiclePreview } from "@/features/articles/preview/StudioListiclePreview";

export const metadata: Metadata = {
  title: "Preview — Questurian",
  robots: { index: false, follow: false },
};

export default function StudioListiclePreviewPage() {
  return (
    <SiteFonts>
      <main className="flex-1">
        <StudioListiclePreview headingsByMoment={renderEveryListicleMomentHeading()} />
      </main>
    </SiteFonts>
  );
}
