import "../../styles/public-routes.css";

import type { Metadata } from "next";

import { SiteFonts } from "@/components/layout/SiteFonts";
import { StudioItineraryPreview } from "@/features/articles/preview/StudioItineraryPreview";

export const metadata: Metadata = {
  title: "Preview — Questurian",
  robots: { index: false, follow: false },
};

export default function StudioItineraryPreviewPage() {
  return (
    <SiteFonts>
      <main className="flex-1">
        <StudioItineraryPreview />
      </main>
    </SiteFonts>
  );
}
