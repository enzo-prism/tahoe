import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SEVERITY_BADGE_CLASSES = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

type BadgeTone = keyof typeof SEVERITY_BADGE_CLASSES;

const SUMMARY_ITEMS: Array<{ label: string; description: string; tone: BadgeTone }> = [
  { label: "Good to go", description: "Drive normally.", tone: "GREEN" },
  { label: "Use caution", description: "Bring chains and slow down.", tone: "YELLOW" },
  { label: "Chains required", description: "Most cars need chains.", tone: "ORANGE" },
  { label: "Do not go", description: "Road closed or held.", tone: "RED" }
];

const CODE_DEFINITIONS: Array<{ code: string; description: string; tone: BadgeTone }> = [
  {
    code: "R-1",
    description: "Chains required; 4WD/AWD with snow tires are OK (must carry).",
    tone: "YELLOW"
  },
  {
    code: "R-2",
    description: "Chains required on most cars (4WD/AWD with snow tires OK, must carry).",
    tone: "ORANGE"
  },
  {
    code: "R-3",
    description: "Chains required on all vehicles.",
    tone: "RED"
  },
  { code: "RC", description: "Road closed.", tone: "RED" },
  { code: "HT", description: "All traffic held at checkpoint.", tone: "RED" },
  { code: "ESC", description: "CHP escorting traffic.", tone: "RED" },
  { code: "TS", description: "Truck checkpoint (may slow traffic).", tone: "ORANGE" },
  { code: "MAX", description: "Truck chains: maximum required.", tone: "ORANGE" },
  { code: "MIN", description: "Truck chains: minimum required.", tone: "YELLOW" }
];

export function MapLegend() {
  return (
    <Card className="bg-white/90 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Legend</CardTitle>
        <CardDescription className="text-[0.7rem]">
          Tap for code meanings and chain rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <div className="space-y-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Status colors
          </p>
          {SUMMARY_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-[0.65rem]", SEVERITY_BADGE_CLASSES[item.tone])}
              >
                {item.label}
              </Badge>
              <span>{item.description}</span>
            </div>
          ))}
        </div>

        <Accordion
          type="single"
          collapsible
          className="rounded-md border border-border/60 bg-white/70 px-2"
        >
          <AccordionItem value="codes" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs">
              Code meanings
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-2 text-[0.7rem] leading-relaxed text-muted-foreground">
                {CODE_DEFINITIONS.map((definition) => (
                  <div key={definition.code} className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold",
                        SEVERITY_BADGE_CLASSES[definition.tone]
                      )}
                    >
                      {definition.code}:
                    </Badge>
                    <p>{definition.description}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
