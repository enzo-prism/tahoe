"use client";

import * as React from "react";

import type { RouteFilter } from "@/lib/chainControls";
import type { Severity, VehicleMode } from "@/lib/effectiveStatus";
import { getSeverityLabel, getSeverityMeaning } from "@/lib/effectiveStatus";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SummaryHeroProps {
  routeFilter: RouteFilter;
  onRouteChange: (route: RouteFilter) => void;
  corridorTitle: string;
  severity: Severity;
  vehicleMode: VehicleMode;
}

const SEVERITY_EMOJI: Record<Severity, string> = {
  GREEN: "✅",
  YELLOW: "⚠️",
  ORANGE: "🟧",
  RED: "🛑"
};

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const MODE_LABELS: Record<VehicleMode, string> = {
  car: "Car/SUV",
  truck: "Truck/Commercial"
};

export function SummaryHero({
  routeFilter,
  onRouteChange,
  corridorTitle,
  severity,
  vehicleMode
}: SummaryHeroProps) {
  const label = getSeverityLabel(severity);
  const meaning = getSeverityMeaning(severity);

  return (
    <Card className="border-border/60 bg-white/80 backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Can we go now?</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick a corridor to get a simple answer for {MODE_LABELS[vehicleMode]} travel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Corridor
            </p>
            <Select value={routeFilter} onValueChange={(value) => onRouteChange(value as RouteFilter)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select corridor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All corridors</SelectItem>
                <SelectItem value="I-80">I-80 (Donner Pass)</SelectItem>
                <SelectItem value="US-50">US-50 (Echo Summit)</SelectItem>
                <SelectItem value="SR-88">SR-88 (Carson Pass)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {corridorTitle}
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="text-lg">{SEVERITY_EMOJI[severity]}</span>
              <span>{meaning}</span>
            </div>
            <Badge
              variant="outline"
              className={cn("w-fit text-[0.65rem]", SEVERITY_BADGE_CLASSES[severity])}
            >
              {label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
