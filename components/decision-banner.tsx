import { Info } from "lucide-react";

import type { DecisionSummary } from "@/lib/types";
import { formatReasonLine } from "@/lib/chainControls";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const ALERT_VARIANTS: Record<DecisionSummary["severity"], "success" | "caution" | "warning" | "danger"> = {
  GREEN: "success",
  YELLOW: "caution",
  ORANGE: "warning",
  RED: "danger"
};

const BADGE_CLASSES: Record<DecisionSummary["severity"], string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const CALL_OUT: Record<DecisionSummary["severity"], string> = {
  GREEN: "Good to go - keep chains ready and recheck before departure.",
  YELLOW: "Use caution - active controls and slower travel are likely.",
  ORANGE: "Chains likely needed - expect chain-up delays.",
  RED: "Avoid / Delay - expect closures, holds, or extreme chain requirements."
};

interface DecisionBannerProps {
  summary: DecisionSummary;
  directionCallout: string;
}

export function DecisionBanner({ summary, directionCallout }: DecisionBannerProps) {
  const topReason = summary.reasons[0];
  const reasonText = topReason ? formatReasonLine(topReason) : "No active chain controls.";
  const isPlaceholder = topReason ? !topReason.status && !topReason.route : false;

  return (
    <Alert variant={ALERT_VARIANTS[summary.severity]} className="border-l-4">
      <AlertTitle className="flex flex-wrap items-center gap-2 text-base">
        <span>{summary.title}</span>
        <Badge
          variant="outline"
          className={cn("text-xs", BADGE_CLASSES[summary.severity])}
        >
          {summary.label}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{CALL_OUT[summary.severity]}</p>
        <p className="text-sm text-muted-foreground">{directionCallout}</p>
        {topReason ? (
          isPlaceholder ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Top reason:</span>
                    <span>{reasonText}</span>
                    <span>- {topReason.updatedAt}</span>
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {topReason.statusDescription}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Top reason:</span>
              <span>{reasonText}</span>
              <span>- {topReason.updatedAt}</span>
            </div>
          )
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
