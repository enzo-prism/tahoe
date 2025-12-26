import type { RouteFilter } from "@/lib/chainControls";
import type { VehicleMode } from "@/lib/effectiveStatus";

const SEGMENT_TO_ROUTE_FILTER = {
  "i-80": "I-80",
  "us-50": "US-50",
  "sr-88": "SR-88"
} as const;

const ROUTE_FILTER_TO_SEGMENT: Record<Exclude<RouteFilter, "All">, CorridorSegment> = {
  "I-80": "i-80",
  "US-50": "us-50",
  "SR-88": "sr-88"
};

export type CorridorSegment = keyof typeof SEGMENT_TO_ROUTE_FILTER;

export const CORRIDOR_SEGMENTS = Object.keys(
  SEGMENT_TO_ROUTE_FILTER
) as CorridorSegment[];

export function getRouteFilterFromSegment(
  segment: string
): Exclude<RouteFilter, "All"> | null {
  return SEGMENT_TO_ROUTE_FILTER[segment as CorridorSegment] ?? null;
}

export function getSegmentFromRouteFilter(filter: RouteFilter): CorridorSegment | null {
  if (filter === "All") {
    return null;
  }
  return ROUTE_FILTER_TO_SEGMENT[filter];
}

export function getPathForState(routeFilter: RouteFilter, vehicleMode: VehicleMode): string {
  const segment = getSegmentFromRouteFilter(routeFilter);
  if (vehicleMode === "truck") {
    return segment ? `/truck/${segment}` : "/truck";
  }
  return segment ? `/${segment}` : "/";
}
