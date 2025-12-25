"use client";

import * as React from "react";

import type { CorridorKey, ChainControlPoint } from "@/lib/types";
import { formatDirection, formatTimestamp } from "@/lib/chainControls";
import {
  type Severity,
  type VehicleMode,
  getPointCode,
  getPointSeverity,
  getPointStatusLabel,
  getSeverityLabel
} from "@/lib/effectiveStatus";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

interface PointDetailsSheetProps {
  point: ChainControlPoint | null;
  corridorKey: CorridorKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewCorridor: (key: CorridorKey) => void;
  onJumpToTable: (point: ChainControlPoint) => void;
  vehicleMode: VehicleMode;
}

export function PointDetailsSheet({
  point,
  corridorKey,
  open,
  onOpenChange,
  onViewCorridor,
  onJumpToTable,
  vehicleMode
}: PointDetailsSheetProps) {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const side = isDesktop ? "right" : "bottom";
  const sheetClass = isDesktop
    ? "flex h-full flex-col overflow-y-auto"
    : "flex max-h-[85vh] flex-col overflow-y-auto";

  if (!point) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className={sheetClass} />
      </Sheet>
    );
  }

  const severity = getPointSeverity(point, vehicleMode);
  const label = getSeverityLabel(severity);
  const directionLabel = formatDirection(point.direction);
  const routeLabel = directionLabel ? `${point.route} ${directionLabel}` : point.route;
  const updatedStatus = formatTimestamp(point.statusTimestamp);
  const updatedRecord = formatTimestamp(point.recordTimestamp);
  const statusCode = getPointCode(point);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={sheetClass}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", SEVERITY_BADGE_CLASSES[severity])}
            >
              {point.status || "Unknown"}
            </Badge>
            <span>{label}</span>
          </SheetTitle>
          <SheetDescription>
            {routeLabel} - {point.locationName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">County</p>
              <p>{point.county || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Elevation</p>
              <p>{point.elevation !== null ? `${point.elevation.toLocaleString()} ft` : "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Direction</p>
              <p>{formatDirection(point.direction) || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Nearby</p>
              <p>{point.nearbyPlace || "-"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Status notes</p>
            <p className="text-sm text-foreground">{getPointStatusLabel(point)}</p>
            <p className="text-xs text-muted-foreground">
              {point.statusDescription || "No additional notes."}
            </p>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Code:</span> {statusCode}
            </p>
            <p>
              <span className="font-semibold text-foreground">Status updated:</span> {updatedStatus}
            </p>
            <p>
              <span className="font-semibold text-foreground">Record updated:</span> {updatedRecord}
            </p>
          </div>
        </div>

        <SheetFooter className="mt-auto gap-2">
          <Button
            variant="secondary"
            onClick={() => corridorKey && onViewCorridor(corridorKey)}
            disabled={!corridorKey}
          >
            View corridor
          </Button>
          <Button onClick={() => onJumpToTable(point)}>Jump to table</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
