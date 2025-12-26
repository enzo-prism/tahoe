import type { Metadata } from "next";

import ChainControlPage from "@/components/ChainControlPage";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Tahoe Truck Chain Controls (Live)";
const DESCRIPTION =
  "Live truck chain control map for Bay Area to Lake Tahoe. Filter I-80, US-50 or SR-88 and see chain-required, caution, or road-closed segments.";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: TITLE,
    description: DESCRIPTION,
    canonicalPath: "/truck"
  });
}

export default function TruckPage() {
  return <ChainControlPage initialVehicleMode="truck" initialRouteFilter="All" />;
}
