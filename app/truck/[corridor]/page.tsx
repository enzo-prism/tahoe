import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ChainControlPage from "@/components/ChainControlPage";
import type { RouteFilter } from "@/lib/chainControls";
import { buildMetadata } from "@/lib/seo";
import {
  CORRIDOR_SEGMENTS,
  getRouteFilterFromSegment
} from "@/lib/routePaths";

const TITLE_BY_ROUTE: Record<Exclude<RouteFilter, "All">, string> = {
  "I-80": "I-80 Truck Chain Control to Tahoe (Live)",
  "US-50": "US-50 Truck Chain Control to Tahoe (Live)",
  "SR-88": "SR-88 Truck Chain Control to Tahoe (Live)"
};

const DESCRIPTION_BY_ROUTE: Record<Exclude<RouteFilter, "All">, string> = {
  "I-80":
    "Live truck chain control map for Bay Area to Lake Tahoe via I-80. See chain-required, caution, or road-closed segments.",
  "US-50":
    "Live truck chain control map for Bay Area to Lake Tahoe via US-50. See chain-required, caution, or road-closed segments.",
  "SR-88":
    "Live truck chain control map for Bay Area to Lake Tahoe via SR-88. See chain-required, caution, or road-closed segments."
};

export const dynamicParams = false;

export function generateStaticParams() {
  return CORRIDOR_SEGMENTS.map((corridor) => ({ corridor }));
}

export function generateMetadata({
  params
}: {
  params: { corridor: string };
}): Metadata {
  const routeFilter = getRouteFilterFromSegment(params.corridor);
  if (!routeFilter) {
    notFound();
  }

  return buildMetadata({
    title: TITLE_BY_ROUTE[routeFilter],
    description: DESCRIPTION_BY_ROUTE[routeFilter],
    canonicalPath: `/truck/${params.corridor}`
  });
}

export default function TruckCorridorPage({
  params
}: {
  params: { corridor: string };
}) {
  const routeFilter = getRouteFilterFromSegment(params.corridor);
  if (!routeFilter) {
    notFound();
  }

  return <ChainControlPage initialVehicleMode="truck" initialRouteFilter={routeFilter} />;
}
