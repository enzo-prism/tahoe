import { Info } from "lucide-react";

import type { CorridorKey, CorridorSummary } from "@/lib/types";
import { formatReasonLine } from "@/lib/chainControls";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SEVERITY_BADGE_CLASSES: Record<CorridorSummary["severity"], string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const REASON_BADGE_CLASSES: Record<
  CorridorSummary["reasons"][number]["severity"],
  string
> = {
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

interface CorridorSafetyProps {
  summaries: CorridorSummary[];
  onViewDetails: (key: CorridorKey) => void;
  isRefreshing?: boolean;
}

export function CorridorSafety({
  summaries,
  onViewDetails,
  isRefreshing
}: CorridorSafetyProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Corridor Safety
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Should we leave now?
          </h2>
          <p className="text-sm text-muted-foreground">
            Quick go / caution / don't go readouts for each major corridor.
          </p>
        </div>
        {isRefreshing ? (
          <p className="text-xs font-medium text-muted-foreground">Refreshing live data...</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {summaries.map((summary) => {
          return (
            <Card key={summary.key} className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">{summary.title}</CardTitle>
                <CardDescription>{summary.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", SEVERITY_BADGE_CLASSES[summary.severity])}
                  >
                    {summary.label}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    Score {summary.score}/100
                  </span>
                </div>

                <Progress value={summary.score} />

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top reasons
                  </p>
                  <div className="space-y-2">
                    {summary.reasons.map((reason, index) => {
                      const isPlaceholder = !reason.status && !reason.route;
                      const reasonText = formatReasonLine(reason);

                      if (isPlaceholder) {
                        return (
                          <Popover key={`${summary.key}-reason-${index}`}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-2 text-left text-xs text-muted-foreground"
                                aria-label="Why no active controls"
                              >
                                <span>{reasonText}</span>
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="max-w-xs text-xs">
                              {reason.statusDescription}
                            </PopoverContent>
                          </Popover>
                        );
                      }

                      return (
                        <div
                          key={`${summary.key}-reason-${index}`}
                          className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center"
                        >
                          <Badge
                            variant="outline"
                            className={cn("text-[0.65rem]", REASON_BADGE_CLASSES[reason.severity])}
                          >
                            {reason.status}
                          </Badge>
                          <span className="text-foreground">{reasonText}</span>
                          <span className="text-muted-foreground">- {reason.updatedAt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => onViewDetails(summary.key)}
                >
                  View details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
