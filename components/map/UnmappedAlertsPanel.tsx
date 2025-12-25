"use client";

import * as React from "react";

import type { ChainControlPoint, CorridorSeverity } from "@/lib/types";
import { computePointSeverity, formatDirection } from "@/lib/chainControls";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SEVERITY_BADGE_CLASSES: Record<CorridorSeverity, string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

interface UnmappedAlertsPanelProps {
  alerts: ChainControlPoint[];
  onViewPoint: (point: ChainControlPoint) => void;
  onOpenDetails: () => void;
  severityForPoint?: (point: ChainControlPoint) => CorridorSeverity;
}

const getLocationLabel = (point: ChainControlPoint) => {
  const locationName = point.locationName?.trim();
  if (locationName) {
    return locationName;
  }

  const directionLabel = formatDirection(point.direction);
  const routeLabel = directionLabel ? `${point.route} ${directionLabel}` : point.route;
  return routeLabel || "Unknown location";
};

export function UnmappedAlertsPanel({
  alerts,
  onViewPoint,
  onOpenDetails,
  severityForPoint
}: UnmappedAlertsPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  const computeSeverity = severityForPoint ?? computePointSeverity;
  const hasRed = alerts.some((alert) => computeSeverity(alert) === "RED");
  const previewAlerts = alerts.slice(0, 3);
  const remaining = alerts.length - previewAlerts.length;

  return (
    <Alert
      variant={hasRed ? "destructive" : "warning"}
      className="border-border/60 bg-white/80 backdrop-blur"
    >
      <AlertTitle className="text-sm">
        ⚠️ {alerts.length} alert{alerts.length === 1 ? "" : "s"} not shown on map
      </AlertTitle>
      <AlertDescription className="space-y-3 text-xs text-muted-foreground">
        <p>These corridor alerts don't include coordinates, so they can't be placed on the map.</p>
        <Separator className="bg-border/60" />
        <div className="space-y-2">
          {previewAlerts.map((alert) => {
            const severity = computeSeverity(alert);
            const statusLabel = alert.status?.trim() || "Unknown";
            const locationLabel = getLocationLabel(alert);
            const nearbyLabel = alert.nearbyPlace?.trim()
              ? ` near ${alert.nearbyPlace.trim()}`
              : "";
            const detailText = `${statusLabel} at ${locationLabel}${nearbyLabel}`;

            return (
              <div
                key={`unmapped-${alert.index}`}
                className="flex flex-col gap-2 rounded-md border border-border/60 bg-white/80 p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[0.6rem] font-semibold",
                      SEVERITY_BADGE_CLASSES[severity]
                    )}
                  >
                    {severity}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[0.6rem] font-semibold text-foreground"
                  >
                    {statusLabel}
                  </Badge>
                  <span className="text-foreground">{detailText}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewPoint(alert)}
                  className="h-7 px-3 text-xs"
                >
                  View
                </Button>
              </div>
            );
          })}
        </div>
        {remaining > 0 ? (
          <p className="text-[0.7rem] text-muted-foreground">
            + {remaining} more (see Details tab)
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDetails}
            className="h-7 px-3 text-xs"
          >
            Open Details
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
