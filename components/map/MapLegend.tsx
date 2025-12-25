import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SEVERITY_BADGE_CLASSES = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

interface MapLegendProps {
  isUsingDemoTiles: boolean;
}

export function MapLegend({ isUsingDemoTiles }: MapLegendProps) {
  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES.GREEN)}
          >
            R-0
          </Badge>
          <span>Good to go</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES.YELLOW)}
          >
            R-1
          </Badge>
          <span>Use caution</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES.ORANGE)}
          >
            R-2
          </Badge>
          <span>Chains likely needed</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES.RED)}
          >
            R-3/RC/HT/ESC
          </Badge>
          <span>Avoid / Delay</span>
        </div>
        {isUsingDemoTiles ? (
          <p className="text-[0.7rem] text-muted-foreground">
            Demo tiles in use. Set NEXT_PUBLIC_MAPTILER_KEY for production styling.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
