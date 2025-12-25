"use client";

import type { CorridorKey, CorridorLabel, ChainControlPoint } from "@/lib/types";
import {
  computePointSeverity,
  formatDirection,
  formatTimestamp
} from "@/lib/chainControls";
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

const SEVERITY_BADGE_CLASSES = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const SEVERITY_LABELS: Record<"GREEN" | "YELLOW" | "ORANGE" | "RED", CorridorLabel> = {
  GREEN: "Good to go",
  YELLOW: "Use caution",
  ORANGE: "Chains likely needed",
  RED: "Avoid / Delay"
};

interface PointDetailsSheetProps {
  point: ChainControlPoint | null;
  corridorKey: CorridorKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewCorridor: (key: CorridorKey) => void;
  onJumpToTable: (point: ChainControlPoint) => void;
}

export function PointDetailsSheet({
  point,
  corridorKey,
  open,
  onOpenChange,
  onViewCorridor,
  onJumpToTable
}: PointDetailsSheetProps) {
  if (!point) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const severity = computePointSeverity(point);
  const label = SEVERITY_LABELS[severity];
  const directionLabel = formatDirection(point.direction);
  const routeLabel = directionLabel ? `${point.route} ${directionLabel}` : point.route;
  const updatedStatus = formatTimestamp(point.statusTimestamp);
  const updatedRecord = formatTimestamp(point.recordTimestamp);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full flex-col">
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
            <p className="text-sm text-foreground">
              {point.statusDescription || "No additional notes."}
            </p>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
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
