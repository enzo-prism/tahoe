"use client";

import * as React from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef
} from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";

import type { ChainControlPoint, CorridorKey } from "@/lib/types";
import type { RouteFilter } from "@/lib/chainControls";
import { formatDirection, formatTimestamp, hasValidCoords } from "@/lib/chainControls";
import {
  type Severity,
  type VehicleMode,
  getPointCode,
  getPointSeverity,
  getPointStatusLabel,
  getSeverityLabel,
  isTruckOnly
} from "@/lib/effectiveStatus";
import { DEFAULT_BOUNDS, getBoundsFromPoints } from "@/lib/mapUtils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import corridorGeoJson from "@/data/corridors.geojson";

const MARKER_CLASSES = {
  GREEN: "bg-emerald-500 border-emerald-700",
  YELLOW: "bg-yellow-400 border-yellow-700",
  ORANGE: "bg-orange-500 border-orange-700",
  RED: "bg-red-500 border-red-700",
  TRUCK: "bg-slate-400 border-slate-600"
};

const POPUP_BADGE_CLASSES = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900",
  TRUCK: "border-slate-200 bg-slate-100 text-slate-900"
};

interface ChainControlMapProps {
  points: ChainControlPoint[];
  selectedPoint: ChainControlPoint | null;
  onSelectPoint: (point: ChainControlPoint | null) => void;
  fitKey: string;
  mapStyleUrl: string;
  corridorSeverities: Record<CorridorKey, Severity>;
  routeFilter: RouteFilter;
  vehicleMode: VehicleMode;
}

type CorridorFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: number[][] };
    properties: { key: CorridorKey; name: string; severity?: Severity; isSelected?: boolean };
  }>;
};

const SEVERITY_LINE_COLORS: Record<Severity, string> = {
  GREEN: "#10b981",
  YELLOW: "#facc15",
  ORANGE: "#f97316",
  RED: "#ef4444"
};

export function ChainControlMap({
  points,
  selectedPoint,
  onSelectPoint,
  fitKey,
  mapStyleUrl,
  corridorSeverities,
  routeFilter,
  vehicleMode
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

  const corridorData = React.useMemo(() => {
    const selectedKey: CorridorKey | null =
      routeFilter === "I-80"
        ? "I80"
        : routeFilter === "US-50"
          ? "US50"
          : routeFilter === "SR-88"
            ? "SR88"
            : null;

    const base = corridorGeoJson as CorridorFeatureCollection;
    return {
      ...base,
      features: base.features.map((feature) => {
        const key = feature.properties.key;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            severity: corridorSeverities[key] ?? "GREEN",
            isSelected: selectedKey ? key === selectedKey : false
          }
        };
      })
    } satisfies CorridorFeatureCollection;
  }, [corridorSeverities, routeFilter]);

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

      <Source id="corridors" type="geojson" data={corridorData}>
        <Layer
          id="corridor-lines"
          type="line"
          paint={{
            "line-color": [
              "match",
              ["get", "severity"],
              "GREEN",
              SEVERITY_LINE_COLORS.GREEN,
              "YELLOW",
              SEVERITY_LINE_COLORS.YELLOW,
              "ORANGE",
              SEVERITY_LINE_COLORS.ORANGE,
              "RED",
              SEVERITY_LINE_COLORS.RED,
              SEVERITY_LINE_COLORS.GREEN
            ],
            "line-width": [
              "case",
              ["boolean", ["get", "isSelected"], false],
              5,
              3
            ],
            "line-opacity": 0.8
          }}
        />
      </Source>

      {pointsWithCoords.map((point) => {
        const statusCode = getPointCode(point);
        const severity = getPointSeverity(point, vehicleMode);
        const isTruckAdvisory = vehicleMode === "car" && isTruckOnly(statusCode);
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
                isTruckAdvisory ? MARKER_CLASSES.TRUCK : MARKER_CLASSES[severity],
                isSelected ? "scale-125 ring-2 ring-white/80" : null
              )}
            />
          </Marker>
        );
      })}

      {selectedPoint && selectedPoint.latitude !== null && selectedPoint.longitude !== null
        ? (() => {
            const statusCode = getPointCode(selectedPoint);
            const severity = getPointSeverity(selectedPoint, vehicleMode);
            const isTruckAdvisory = vehicleMode === "car" && isTruckOnly(statusCode);
            const badgeLabel = isTruckAdvisory
              ? "Truck advisory"
              : getSeverityLabel(severity);
            const badgeClass = isTruckAdvisory
              ? POPUP_BADGE_CLASSES.TRUCK
              : POPUP_BADGE_CLASSES[severity];

            return (
              <Popup
                longitude={selectedPoint.longitude}
                latitude={selectedPoint.latitude}
                closeOnClick={false}
                onClose={() => onSelectPoint(null)}
                anchor="top"
                offset={14}
              >
                <div className="space-y-1 text-xs">
                  <Badge variant="outline" className={cn("text-[0.65rem]", badgeClass)}>
                    {badgeLabel}
                  </Badge>
                  <p className="text-muted-foreground">
                    {getPointStatusLabel(selectedPoint)}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">Code: {statusCode}</p>
                  <p className="font-medium text-foreground">
                    {selectedPoint.route} {formatDirection(selectedPoint.direction)}
                  </p>
                  <p className="text-muted-foreground">{selectedPoint.locationName}</p>
                  <p className="text-muted-foreground">
                    Updated{" "}
                    {formatTimestamp(
                      selectedPoint.statusTimestamp ?? selectedPoint.recordTimestamp
                    )}
                  </p>
                </div>
              </Popup>
            );
          })()
        : null}
    </Map>
  );
}
