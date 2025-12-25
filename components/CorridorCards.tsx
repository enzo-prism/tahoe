"use client";

import * as React from "react";
import { Info } from "lucide-react";

import type { EffectiveCorridor, Severity, VehicleMode } from "@/lib/effectiveStatus";
import { formatTimestamp } from "@/lib/chainControls";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CorridorCardsProps {
  corridors: EffectiveCorridor[];
  vehicleMode: VehicleMode;
}

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const SEVERITY_DOT_CLASSES: Record<Severity, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-yellow-400",
  ORANGE: "bg-orange-500",
  RED: "bg-red-500"
};

const formatEpoch = (epoch: number) => {
  if (!epoch) {
    return "Unknown";
  }
  return formatTimestamp(new Date(epoch).toISOString());
};

export function CorridorCards({ corridors, vehicleMode }: CorridorCardsProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Corridor Summary
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Key routes at a glance
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {corridors.map((corridor) => (
          <Card key={corridor.key} className="border-border/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">{corridor.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant="outline"
                  className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES[corridor.severity])}
                >
                  {corridor.label}
                </Badge>
                <span>{corridor.meaning}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why?
                </p>
                {corridor.reasons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active alerts right now.</p>
                ) : (
                  <div className="space-y-2">
                    {corridor.reasons.map((reason, index) => (
                      <div
                        key={`${corridor.key}-reason-${index}`}
                        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span
                          className={cn("h-2 w-2 rounded-full", SEVERITY_DOT_CLASSES[reason.severity])}
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{reason.text}</span>
                        <span className="text-muted-foreground">• {formatEpoch(reason.updatedAt)}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Show status code"
                              >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Code: {reason.code}
                              {reason.isTruckOnly ? " (truck-only)" : ""}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {vehicleMode === "car" && corridor.truckAdvisories.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={`${corridor.key}-truck`}>
                    <AccordionTrigger className="text-xs">
                      🚚 Truck advisories (may slow traffic)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        {corridor.truckAdvisories.map((advisory, index) => (
                          <div
                            key={`${corridor.key}-truck-${index}`}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span className="text-foreground">{advisory.text}</span>
                            <span className="text-muted-foreground">
                              • {formatEpoch(advisory.updatedAt)}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    aria-label="Show status code"
                                  >
                                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Code: {advisory.code}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
