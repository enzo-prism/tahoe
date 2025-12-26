import type { Metadata } from "next";
import { Suspense } from "react";

import ChainControlPage from "@/components/ChainControlPage";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Tahoe Chain Control Map (Live): I-80, US-50 & SR-88";
const DESCRIPTION =
  "Live chain control map for Bay Area to Lake Tahoe. Filter I-80, US-50 or SR-88 for car/truck and see chain-required, caution, or road-closed segments.";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: TITLE,
    description: DESCRIPTION,
    canonicalPath: "/"
  });
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50" />
      }
    >
      <ChainControlPage />
    </Suspense>
  );
}
