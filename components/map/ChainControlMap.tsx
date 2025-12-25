"use client";

import * as React from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef
} from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";

import type { ChainControlPoint } from "@/lib/types";
import {
  computePointSeverity,
  hasValidCoords,
  formatDirection,
  formatTimestamp
} from "@/lib/chainControls";
import { DEFAULT_BOUNDS, getBoundsFromPoints } from "@/lib/mapUtils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const MARKER_CLASSES = {
  GREEN: "bg-emerald-500 border-emerald-700",
  YELLOW: "bg-yellow-400 border-yellow-700",
  ORANGE: "bg-orange-500 border-orange-700",
  RED: "bg-red-500 border-red-700"
};

const POPUP_BADGE_CLASSES = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

interface ChainControlMapProps {
  points: ChainControlPoint[];
  selectedPoint: ChainControlPoint | null;
  onSelectPoint: (point: ChainControlPoint | null) => void;
  fitKey: string;
  mapStyleUrl: string;
}

export function ChainControlMap({
  points,
  selectedPoint,
  onSelectPoint,
  fitKey,
  mapStyleUrl
}: ChainControlMapProps) {
  const mapRef = React.useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const lastFitKey = React.useRef<string | null>(null);

  const pointsWithCoords = React.useMemo(
    () =>
      points.filter(
        (point): point is ChainControlPoint & { latitude: number; longitude: number } =>
          hasValidCoords(point)
      ),
    [points]
  );

  React.useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }
    if (lastFitKey.current === fitKey) {
      return;
    }

    const bounds = getBoundsFromPoints(pointsWithCoords) ?? DEFAULT_BOUNDS;
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 700 });
    lastFitKey.current = fitKey;
  }, [fitKey, mapReady, pointsWithCoords]);

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={mapStyleUrl}
      initialViewState={{ bounds: DEFAULT_BOUNDS, fitBoundsOptions: { padding: 80 } }}
      onLoad={() => setMapReady(true)}
      onClick={() => onSelectPoint(null)}
      style={{ width: "100%", height: "100%" }}
      reuseMaps
    >
      <NavigationControl position="bottom-right" showCompass={false} />

      {pointsWithCoords.map((point) => {
        const severity = computePointSeverity(point);
        const isSelected = selectedPoint?.index === point.index;
        return (
          <Marker
            key={point.index}
            longitude={point.longitude}
            latitude={point.latitude}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelectPoint(point);
            }}
          >
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 shadow-sm transition-transform",
                MARKER_CLASSES[severity],
                isSelected ? "scale-125 ring-2 ring-white/80" : null
              )}
            />
          </Marker>
        );
      })}

      {selectedPoint && selectedPoint.latitude !== null && selectedPoint.longitude !== null ? (
        <Popup
          longitude={selectedPoint.longitude}
          latitude={selectedPoint.latitude}
          closeOnClick={false}
          onClose={() => onSelectPoint(null)}
          anchor="top"
          offset={14}
        >
          <div className="space-y-1 text-xs">
            <Badge
              variant="outline"
              className={cn(
                "text-[0.65rem]",
                POPUP_BADGE_CLASSES[computePointSeverity(selectedPoint)]
              )}
            >
              {selectedPoint.status || "Unknown"}
            </Badge>
            <p className="font-medium text-foreground">
              {selectedPoint.route} {formatDirection(selectedPoint.direction)}
            </p>
            <p className="text-muted-foreground">{selectedPoint.locationName}</p>
            <p className="text-muted-foreground">
              Updated {formatTimestamp(selectedPoint.statusTimestamp ?? selectedPoint.recordTimestamp)}
            </p>
          </div>
        </Popup>
      ) : null}
    </Map>
  );
}
