import type { ChainControlPoint } from "@/lib/types";

export type LngLatBoundsTuple = [[number, number], [number, number]];

export const DEFAULT_BOUNDS: LngLatBoundsTuple = [
  [-122.6, 37.0],
  [-119.8, 39.6]
];

export function getBoundsFromPoints(points: ChainControlPoint[]): LngLatBoundsTuple | null {
  const coords = points
    .filter(
      (point): point is ChainControlPoint & { longitude: number; latitude: number } =>
        point.longitude !== null && point.latitude !== null
    )
    .map((point) => [point.longitude, point.latitude]);

  if (coords.length === 0) {
    return null;
  }

  const lons = coords.map((coord) => coord[0]);
  const lats = coords.map((coord) => coord[1]);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return [
    [minLon, minLat],
    [maxLon, maxLat]
  ];
}
