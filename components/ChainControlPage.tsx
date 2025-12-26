"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  type RouteFilter,
  ROUTE_FILTERS,
  filterPointsByQuery,
  formatDirection,
  formatTimestamp,
  getCorridorKeyForRoute,
  getLatestTimestamp
} from "@/lib/chainControls";
import { getMapStyleUrl } from "@/lib/mapStyle";
import type {
  ChainControlPoint,
  ChainControlResponse,
  CorridorKey
} from "@/lib/types";
import {
  type VehicleMode,
  type Severity,
  computeEffectiveCorridors,
  getDisplayPoints,
  getMapPoints,
  getPointCode,
  getPointSeverity,
  getPointStatusLabel,
  getSeverityLabel,
  getUnmappedAlerts,
  isTruckOnly,
  sortPointsForMode
} from "@/lib/effectiveStatus";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VehicleModeToggle } from "@/components/VehicleModeToggle";
import { SummaryHero } from "@/components/SummaryHero";
import { CorridorCards } from "@/components/CorridorCards";
import { ChainControlMap } from "@/components/map/ChainControlMap";
import { MapLegend } from "@/components/map/MapLegend";
import { UnmappedAlertsPanel } from "@/components/map/UnmappedAlertsPanel";
import { PointDetailsSheet } from "@/components/map/PointDetailsSheet";
import { Info } from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

type ViewMode = "summary" | "map";

const CORRIDOR_ROUTE_FILTER: Record<CorridorKey, RouteFilter> = {
  I80: "I-80",
  US50: "US-50",
  SR88: "SR-88",
  CONNECTORS: "All"
};

const ROUTE_TO_CORRIDOR: Record<Exclude<RouteFilter, "All">, CorridorKey> = {
  "I-80": "I80",
  "US-50": "US50",
  "SR-88": "SR88"
};

const STATUS_BADGE_CLASSES: Record<Severity, string> = {
  GREEN: "border-emerald-200 bg-emerald-100 text-emerald-900",
  YELLOW: "border-yellow-200 bg-yellow-100 text-yellow-900",
  ORANGE: "border-orange-200 bg-orange-100 text-orange-900",
  RED: "border-red-200 bg-red-100 text-red-900"
};

const SEVERITY_EMOJI: Record<Severity, string> = {
  GREEN: "✅",
  YELLOW: "⚠️",
  ORANGE: "🟧",
  RED: "🛑"
};

const SEVERITY_ALERT_VARIANTS: Record<
  Severity,
  "success" | "caution" | "warning" | "destructive"
> = {
  GREEN: "success",
  YELLOW: "caution",
  ORANGE: "warning",
  RED: "destructive"
};

const SEVERITY_RANK: Record<Severity, number> = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

const MODE_LABELS: Record<VehicleMode, string> = {
  car: "Car mode",
  truck: "Truck mode"
};

function AboutDataDetails({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Source feeds
        </p>
        <p>
          We pull chain-control status directly from the official Caltrans public JSON feeds for
          District 3 (Sacramento) and District 10 (Stockton).
        </p>
        <div className="space-y-1 font-mono text-[0.65rem] text-muted-foreground/90">
          <p className="break-all">https://cwwp2.dot.ca.gov/data/d3/cc/ccStatusD03.json</p>
          <p className="break-all">https://cwwp2.dot.ca.gov/data/d10/cc/ccStatusD10.json</p>
        </div>
      </div>
      <Separator className="bg-border/60" />
      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          How we use it
        </p>
        <p>
          Our API endpoint{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.65rem] text-foreground">
            /api/chain-controls
          </code>{" "}
          fetches both feeds, normalizes them into a single list, and caches results for about 60
          seconds.
        </p>
        <p>
          You can always see the last successful refresh time. If the feeds are unreachable, the
          app keeps the most recent data and shows a warning.
        </p>
      </div>
    </div>
  );
}

export default function ChainControlPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = React.useState<ViewMode>("map");
  const [vehicleMode, setVehicleMode] = React.useState<VehicleMode>("car");
  const [showTruckAdvisories, setShowTruckAdvisories] = React.useState(false);
  const [routeFilter, setRouteFilter] = React.useState<RouteFilter>("All");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [points, setPoints] = React.useState<ChainControlPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = React.useState<ChainControlPoint | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMapControlsOpen, setIsMapControlsOpen] = React.useState(false);
  const [stalePointNotice, setStalePointNotice] = React.useState<string | null>(null);
  const hasForcedRefresh = React.useRef(false);
  const mapStyle = getMapStyleUrl();

  React.useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "car" || modeParam === "truck") {
      if (modeParam !== vehicleMode) {
        setVehicleMode(modeParam);
      }
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", vehicleMode);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, vehicleMode]);

  const fetchData = React.useCallback(async (options: { forceFresh?: boolean } = {}) => {
    const shouldForceFresh = options.forceFresh ?? !hasForcedRefresh.current;
    if (!hasForcedRefresh.current) {
      hasForcedRefresh.current = true;
    }
    setIsRefreshing(true);
    try {
      const response = await fetch(
        shouldForceFresh ? "/api/chain-controls?fresh=1" : "/api/chain-controls",
        {
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error("Feed unavailable");
      }
      const data = (await response.json()) as ChainControlResponse;
      setPoints(data.points);
      setUpdatedAt(data.updatedAt);
      setError(null);
    } catch (err) {
      setError("Unable to reach the Caltrans feed. Showing last known data.");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  const handleManualRefresh = React.useCallback(() => {
    fetchData({ forceFresh: true });
  }, [fetchData]);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  React.useEffect(() => {
    if (!selectedPoint) {
      return;
    }
    const match = points.find((point) => point.index === selectedPoint.index);
    if (!match) {
      setSelectedPoint(null);
      setStalePointNotice("That alert is no longer active and has been removed from the live feed.");
      return;
    }
    if (match !== selectedPoint) {
      setSelectedPoint(match);
    }
  }, [points, selectedPoint]);

  React.useEffect(() => {
    if (!stalePointNotice) {
      return;
    }
    const timeout = window.setTimeout(() => setStalePointNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [stalePointNotice]);

  React.useEffect(() => {
    if (viewMode !== "map" && selectedPoint) {
      setSelectedPoint(null);
    }
  }, [viewMode, selectedPoint]);

  React.useEffect(() => {
    if (viewMode !== "map") {
      setIsMapControlsOpen(false);
    }
  }, [viewMode]);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const handleChange = () => {
      if (query.matches) {
        setIsMapControlsOpen(false);
      }
    };
    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const effectiveCorridors = React.useMemo(
    () => computeEffectiveCorridors(points, vehicleMode),
    [points, vehicleMode]
  );

  const corridorSeverityMap = React.useMemo(() => {
    return effectiveCorridors.reduce<Record<CorridorKey, Severity>>((acc, corridor) => {
      acc[corridor.key] = corridor.severity;
      return acc;
    }, {} as Record<CorridorKey, Severity>);
  }, [effectiveCorridors]);

  const selectedSummary = React.useMemo(() => {
    if (routeFilter === "All") {
      const severity = effectiveCorridors.reduce<Severity>((current, corridor) => {
        return SEVERITY_RANK[corridor.severity] > SEVERITY_RANK[current]
          ? corridor.severity
          : current;
      }, "GREEN");
      return {
        title: "All corridors",
        severity
      };
    }

    const corridorKey = ROUTE_TO_CORRIDOR[routeFilter];
    const corridor = effectiveCorridors.find((entry) => entry.key === corridorKey);
    return (
      corridor ?? {
        title: routeFilter,
        severity: "GREEN" as Severity
      }
    );
  }, [effectiveCorridors, routeFilter]);

  const mapPoints = React.useMemo(
    () => getMapPoints(points, routeFilter, vehicleMode, showTruckAdvisories),
    [points, routeFilter, vehicleMode, showTruckAdvisories]
  );

  const unmappedAlerts = React.useMemo(
    () => getUnmappedAlerts(points, routeFilter, vehicleMode),
    [points, routeFilter, vehicleMode]
  );

  const routePoints = React.useMemo(
    () => getDisplayPoints(points, routeFilter),
    [points, routeFilter]
  );

  React.useEffect(() => {
    if (!selectedPoint) {
      return;
    }
    const stillVisible = mapPoints.some((point) => point.index === selectedPoint.index);
    if (!stillVisible) {
      setSelectedPoint(null);
    }
  }, [mapPoints, selectedPoint]);

  const visiblePoints = React.useMemo(() => {
    const filteredByMode =
      vehicleMode === "car"
        ? routePoints.filter((point) => !isTruckOnly(getPointCode(point)))
        : routePoints;
    const filtered = filterPointsByQuery(filteredByMode, searchQuery);
    return sortPointsForMode(filtered, vehicleMode);
  }, [routePoints, searchQuery, vehicleMode]);

  const latestRecord = React.useMemo(
    () => getLatestTimestamp(routePoints, "recordTimestamp"),
    [routePoints]
  );
  const latestStatus = React.useMemo(
    () => getLatestTimestamp(routePoints, "statusTimestamp"),
    [routePoints]
  );

  const handleRouteChange = React.useCallback(
    (nextRoute: RouteFilter) => {
      setRouteFilter(nextRoute);
      setSearchQuery("");
    },
    []
  );

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleVehicleModeChange = React.useCallback(
    (mode: VehicleMode) => {
      setVehicleMode(mode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", mode);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleViewCorridorFromMap = React.useCallback(
    (key: CorridorKey) => {
      setRouteFilter(CORRIDOR_ROUTE_FILTER[key]);
      setSearchQuery("");
      setViewMode("summary");
    },
    []
  );

  const handleJumpToTable = React.useCallback(
    (point: ChainControlPoint) => {
      const nextRoute =
        point.route === "I-80" || point.route === "US-50" || point.route === "SR-88"
          ? (point.route as RouteFilter)
          : "All";

      setViewMode("summary");
      setRouteFilter(nextRoute);
      setSearchQuery("");
      setSelectedPoint(null);
      window.setTimeout(() => {
        const target =
          document.getElementById(`row-${point.index}`) ??
          document.getElementById(`card-${point.index}`);
        target?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 250);
    },
    []
  );

  const handleOpenSummaryFromMap = React.useCallback(() => {
    setViewMode("summary");
    setSearchQuery("");
    window.setTimeout(() => {
      document.getElementById("chain-control-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 200);
  }, []);

  const handleViewPointFromPanel = React.useCallback((point: ChainControlPoint) => {
    setSelectedPoint(point);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50">
      <div className="container space-y-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Chain Control Report
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Bay Area ↔ Lake Tahoe
            </h1>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-7 px-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
                >
                  <Info className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  About this data
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(92vw,380px)] max-h-[70vh] overflow-auto"
              >
                <AboutDataDetails />
              </PopoverContent>
            </Popover>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground sm:hidden"
                >
                  <Info className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  About this data
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] space-y-4 overflow-auto">
                <SheetHeader>
                  <SheetTitle>About this data</SheetTitle>
                  <SheetDescription>
                    Where the chain-control updates come from and how they are processed.
                  </SheetDescription>
                </SheetHeader>
                <AboutDataDetails className="text-sm" />
              </SheetContent>
            </Sheet>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh now"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {updatedAt
                ? `Last refreshed ${formatTimestamp(updatedAt)}`
                : "Waiting for first refresh..."}
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <VehicleModeToggle value={vehicleMode} onChange={handleVehicleModeChange} />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Feed connection issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-6">
            {mapStyle.source === "maplibre-demo" ? (
              <Alert className="border-border/60 bg-white/80">
                <AlertDescription className="text-xs text-muted-foreground">
                  Using demo tiles. Set NEXT_PUBLIC_MAPTILER_KEY for production styling.
                </AlertDescription>
              </Alert>
            ) : null}
            {stalePointNotice ? (
              <Alert variant="caution" className="border-amber-200/70 bg-amber-50/80">
                <AlertTitle className="text-sm text-amber-900">Alert updated</AlertTitle>
                <AlertDescription className="text-xs text-amber-900">
                  {stalePointNotice}
                </AlertDescription>
              </Alert>
            ) : null}
            <UnmappedAlertsPanel
              alerts={unmappedAlerts}
              onViewPoint={handleViewPointFromPanel}
              onOpenDetails={handleOpenSummaryFromMap}
              vehicleMode={vehicleMode}
            />
            <Card className="relative overflow-hidden border-border/60">
              <CardContent className="p-0">
                <div className="relative h-[60vh] min-h-[320px] sm:h-[70vh] sm:min-h-[420px]">
                  <ChainControlMap
                    points={mapPoints}
                    selectedPoint={selectedPoint}
                    onSelectPoint={setSelectedPoint}
                    fitKey={routeFilter}
                    mapStyleUrl={mapStyle.url}
                    corridorSeverities={corridorSeverityMap}
                    routeFilter={routeFilter}
                    vehicleMode={vehicleMode}
                  />

                  <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(92%,360px)] -translate-x-1/2">
                    <Alert
                      variant={SEVERITY_ALERT_VARIANTS[selectedSummary.severity]}
                      className="border-border/70 bg-white/90 text-foreground shadow-sm"
                    >
                      <AlertTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {selectedSummary.title}
                      </AlertTitle>
                      <AlertDescription className="text-sm font-semibold text-foreground">
                        {SEVERITY_EMOJI[selectedSummary.severity]}{" "}
                        {getSeverityLabel(selectedSummary.severity)} • {MODE_LABELS[vehicleMode]}
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsMapControlsOpen(true)}
                    className="absolute right-4 top-4 z-10 sm:hidden"
                  >
                    Controls
                  </Button>

                  <div className="absolute left-4 top-4 z-10 hidden w-[260px] space-y-3 sm:block">
                    <Card className="bg-white/90 backdrop-blur">
                      <CardContent className="space-y-3 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Corridor filter
                        </p>
                        <RadioGroup
                          value={routeFilter}
                          onValueChange={(value) => handleRouteChange(value as RouteFilter)}
                          aria-label="Map corridor filter"
                          className="grid grid-cols-2 gap-2"
                        >
                          {ROUTE_FILTERS.map((route) => (
                            <div key={`map-${route}`} className="flex items-center">
                              <RadioGroupItem
                                value={route}
                                id={`map-route-${route}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`map-route-${route}`}
                                className="flex w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-2 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                              >
                                {route}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleManualRefresh}
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? "Refreshing..." : "Refresh now"}
                        </Button>
                        {vehicleMode === "car" ? (
                          <Button
                            variant={showTruckAdvisories ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setShowTruckAdvisories((prev) => !prev)}
                          >
                            {showTruckAdvisories
                              ? "Hide truck advisories"
                              : "Show truck advisories"}
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="absolute right-4 top-4 z-10 hidden w-[220px] sm:block">
                    <MapLegend />
                  </div>

                  <div className="absolute bottom-4 left-4 z-10 rounded-full bg-white/80 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm sm:text-[0.7rem]">
                    {updatedAt
                      ? `Last updated ${formatTimestamp(updatedAt)}`
                      : "Fetching latest data..."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <PointDetailsSheet
              point={selectedPoint}
              corridorKey={selectedPoint ? getCorridorKeyForRoute(selectedPoint.route) : null}
              open={Boolean(selectedPoint)}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedPoint(null);
                }
              }}
              onViewCorridor={handleViewCorridorFromMap}
              onJumpToTable={handleJumpToTable}
              vehicleMode={vehicleMode}
            />

            <Sheet open={isMapControlsOpen} onOpenChange={setIsMapControlsOpen}>
              <SheetContent side="bottom" className="space-y-4 sm:hidden">
                <SheetHeader>
                  <SheetTitle>Map controls</SheetTitle>
                  <SheetDescription>Filter corridors and refresh live data.</SheetDescription>
                </SheetHeader>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Corridor filter
                  </p>
                  <RadioGroup
                    value={routeFilter}
                    onValueChange={(value) => handleRouteChange(value as RouteFilter)}
                    aria-label="Map corridor filter"
                    className="grid grid-cols-2 gap-2"
                  >
                    {ROUTE_FILTERS.map((route) => (
                      <div key={`map-sheet-${route}`} className="flex items-center">
                        <RadioGroupItem
                          value={route}
                          id={`map-sheet-route-${route}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`map-sheet-route-${route}`}
                          className="flex w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-2 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                        >
                          {route}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh now"}
                  </Button>
                  {vehicleMode === "car" ? (
                    <Button
                      variant={showTruckAdvisories ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowTruckAdvisories((prev) => !prev)}
                    >
                      {showTruckAdvisories
                        ? "Hide truck advisories"
                        : "Show truck advisories"}
                    </Button>
                  ) : null}
                </div>

                <Separator />
                <MapLegend />
              </SheetContent>
            </Sheet>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <SummaryHero
              routeFilter={routeFilter}
              onRouteChange={handleRouteChange}
              corridorTitle={selectedSummary.title}
              severity={selectedSummary.severity}
              vehicleMode={vehicleMode}
            />

            <CorridorCards corridors={effectiveCorridors} vehicleMode={vehicleMode} />

            <Card className="border-border/60 bg-white/70">
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium text-foreground">Last status update:</span>{" "}
                      {formatTimestamp(latestStatus)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Last record update:</span>{" "}
                      {formatTimestamp(latestRecord)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {updatedAt ? `Fetched ${formatTimestamp(updatedAt)}` : "Fetching latest data..."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="chain-control-table" className="animate-in fade-in-0">
              <CardHeader className="space-y-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Live alerts</CardTitle>
                    <CardDescription>
                      {isLoading ? "Loading live updates..." : `${visiblePoints.length} results`}
                    </CardDescription>
                  </div>
                  <div className="w-full md:w-72">
                    <Input
                      placeholder="Search location, route, county"
                      value={searchQuery}
                      aria-label="Search chain control points"
                      onChange={(event) => handleSearchChange(event.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {visiblePoints.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {searchQuery.trim()
                      ? "No alerts match that search."
                      : "No active alerts for this corridor right now."}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 sm:hidden">
                      {visiblePoints.map((point) => (
                        <MobilePointCard
                          key={`card-${point.index}`}
                          point={point}
                          vehicleMode={vehicleMode}
                        />
                      ))}
                    </div>
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <span>Alert</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                                      aria-label="Why alert status matters"
                                    >
                                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                      What this means
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="max-w-xs text-xs">
                                    <div className="space-y-1">
                                      <p>
                                        <span className="font-semibold">Use caution:</span> Be
                                        careful and carry chains.
                                      </p>
                                      <p>
                                        <span className="font-semibold">Chains required:</span>{" "}
                                        Most cars must chain up.
                                      </p>
                                      <p>
                                        <span className="font-semibold">Do not go:</span> Road is
                                        closed or held.
                                      </p>
                                      {vehicleMode === "car" ? (
                                        <p>
                                          <span className="font-semibold">Truck advisory:</span>{" "}
                                          Truck-only checkpoints may slow traffic.
                                        </p>
                                      ) : null}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Nearby</TableHead>
                            <TableHead>Direction</TableHead>
                            <TableHead>Elevation</TableHead>
                            <TableHead>County</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visiblePoints.map((point) => {
                            const severity = getPointSeverity(point, vehicleMode);
                            const statusLabel = getSeverityLabel(severity);
                            const statusCode = getPointCode(point);
                            const updated = point.statusTimestamp ?? point.recordTimestamp;
                            return (
                              <TableRow key={point.index} id={`row-${point.index}`}>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant="outline"
                                      className={cn("text-xs", STATUS_BADGE_CLASSES[severity])}
                                    >
                                      {statusLabel}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {statusCode}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{point.route}</TableCell>
                                <TableCell>{point.locationName}</TableCell>
                                <TableCell>{point.nearbyPlace}</TableCell>
                                <TableCell>{point.direction}</TableCell>
                                <TableCell>
                                  {point.elevation !== null
                                    ? `${point.elevation.toLocaleString()} ft`
                                    : "-"}
                                </TableCell>
                                <TableCell>{point.county}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {formatTimestamp(updated)}
                                </TableCell>
                                <TableCell className="max-w-sm text-xs text-muted-foreground">
                                  {point.statusDescription ||
                                    getPointStatusLabel(point) ||
                                    "No additional notes."}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Important checklist</CardTitle>
                <CardDescription>Quick reminders before you head up.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="chains">
                    <AccordionTrigger>Carry chains even if AWD</AccordionTrigger>
                    <AccordionContent>
                      Caltrans checks for chains even for AWD/4WD vehicles. Keep them accessible.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="slow">
                    <AccordionTrigger>Expect slow speeds when chains required</AccordionTrigger>
                    <AccordionContent>
                      Chain controls reduce speeds significantly. Plan extra time and keep following
                      distance.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="supplies">
                    <AccordionTrigger>Bring water/blanket/charger</AccordionTrigger>
                    <AccordionContent>
                      Weather and holds can extend travel time. Pack the basics so you can wait safely.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function MobilePointCard({
  point,
  vehicleMode
}: {
  point: ChainControlPoint;
  vehicleMode: VehicleMode;
}) {
  const severity = getPointSeverity(point, vehicleMode);
  const statusLabel = getSeverityLabel(severity);
  const statusCode = getPointCode(point);
  const statusText = getPointStatusLabel(point);
  const updated = point.statusTimestamp ?? point.recordTimestamp;
  const directionLabel = formatDirection(point.direction);
  const routeLabel = directionLabel ? `${point.route} ${directionLabel}` : point.route;

  return (
    <Card id={`card-${point.index}`}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", STATUS_BADGE_CLASSES[severity])}
          >
            {statusLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(updated)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Code: {statusCode}</p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{routeLabel}</p>
          <p className="text-sm text-foreground">{point.locationName}</p>
          <p className="text-xs text-muted-foreground">{statusText}</p>
          {point.nearbyPlace ? (
            <p className="text-xs text-muted-foreground">{point.nearbyPlace}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>County: {point.county || "-"}</span>
          <span>
            Elevation:{" "}
            {point.elevation !== null ? `${point.elevation.toLocaleString()} ft` : "-"}
          </span>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          {point.statusDescription || "No additional notes."}
        </p>
      </CardContent>
    </Card>
  );
}
