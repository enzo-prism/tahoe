"use client";

import * as React from "react";

import {
  type RouteFilter,
  CORRIDOR_ORDER,
  ROUTE_FILTERS,
  computeCorridorSummary,
  computeDecisionSummary,
  filterPointsByQuery,
  filterPointsForRoute,
  formatDirection,
  formatTimestamp,
  getCorridorKeyForRoute,
  getLatestTimestamp,
  getSeverityForStatus,
  getUnmappedAlerts,
  groupPointsByCorridor,
  sortPoints
} from "@/lib/chainControls";
import { getMapStyleUrl } from "@/lib/mapStyle";
import type {
  ChainControlPoint,
  ChainControlResponse,
  CorridorKey,
  CorridorSummary,
  DecisionSummary,
  SeverityLevel
} from "@/lib/types";
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
import { CorridorSafety } from "@/components/corridor-safety";
import { DecisionBanner } from "@/components/decision-banner";
import { ChainControlMap } from "@/components/map/ChainControlMap";
import { MapLegend } from "@/components/map/MapLegend";
import { UnmappedAlertsPanel } from "@/components/map/UnmappedAlertsPanel";
import { PointDetailsSheet } from "@/components/map/PointDetailsSheet";
import { Info } from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

type Direction = "bay-to-tahoe" | "tahoe-to-bay";
type ViewMode = "list" | "map";

const DIRECTION_CALLOUT: Record<Direction, string> = {
  "bay-to-tahoe": "Clear the pass before conditions worsen.",
  "tahoe-to-bay": "Plan your descent and checkpoint delays."
};

const CONNECTOR_QUERY = "SR-89 SR-267 SR-28 CA-28";

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

const STATUS_BADGE_CLASSES: Record<SeverityLevel, string> = {
  good: "border-emerald-200 bg-emerald-100 text-emerald-900",
  caution: "border-yellow-200 bg-yellow-100 text-yellow-900",
  chains: "border-orange-200 bg-orange-100 text-orange-900",
  avoid: "border-red-200 bg-red-100 text-red-900"
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

export default function Page() {
  const [direction, setDirection] = React.useState<Direction>("bay-to-tahoe");
  const [viewMode, setViewMode] = React.useState<ViewMode>("map");
  const [routeFilter, setRouteFilter] = React.useState<RouteFilter>("All");
  const [corridorFocus, setCorridorFocus] = React.useState<CorridorKey | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [points, setPoints] = React.useState<ChainControlPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = React.useState<ChainControlPoint | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMapControlsOpen, setIsMapControlsOpen] = React.useState(false);
  const [stalePointNotice, setStalePointNotice] = React.useState<string | null>(null);
  const mapStyle = getMapStyleUrl();

  const fetchData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/chain-controls", {
        cache: "no-store"
      });
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
    if (viewMode === "list" && selectedPoint) {
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

  const corridorSummaries = React.useMemo(() => {
    const grouped = groupPointsByCorridor(points);
    return CORRIDOR_ORDER.map((key) => computeCorridorSummary(key, grouped[key]));
  }, [points]);

  const corridorSummaryMap = React.useMemo(() => {
    return corridorSummaries.reduce<Record<CorridorKey, CorridorSummary>>((acc, summary) => {
      acc[summary.key] = summary;
      return acc;
    }, {} as Record<CorridorKey, CorridorSummary>);
  }, [corridorSummaries]);

  const routePoints = React.useMemo(
    () => filterPointsForRoute(points, routeFilter),
    [points, routeFilter]
  );

  const unmappedAlerts = React.useMemo(
    () => getUnmappedAlerts(points, routeFilter),
    [points, routeFilter]
  );

  React.useEffect(() => {
    if (!selectedPoint) {
      return;
    }
    const stillVisible = routePoints.some((point) => point.index === selectedPoint.index);
    if (!stillVisible) {
      setSelectedPoint(null);
    }
  }, [routePoints, selectedPoint]);

  const visiblePoints = React.useMemo(() => {
    const filtered = filterPointsByQuery(routePoints, searchQuery);
    return sortPoints(filtered);
  }, [routePoints, searchQuery]);

  const latestRecord = React.useMemo(
    () => getLatestTimestamp(routePoints, "recordTimestamp"),
    [routePoints]
  );
  const latestStatus = React.useMemo(
    () => getLatestTimestamp(routePoints, "statusTimestamp"),
    [routePoints]
  );

  const decisionSummary = React.useMemo<DecisionSummary>(() => {
    if (corridorFocus) {
      const summary = corridorSummaryMap[corridorFocus];
      if (summary) {
        const { key: _key, ...decision } = summary;
        return decision;
      }
    }

    if (routeFilter === "All") {
      return computeDecisionSummary(
        "All major corridors",
        "I-80, US-50, SR-88, and Tahoe connectors",
        routePoints
      );
    }

    const corridorKey = ROUTE_TO_CORRIDOR[routeFilter];
    const summary = corridorSummaryMap[corridorKey];
    if (summary) {
      const { key: _key, ...decision } = summary;
      return decision;
    }

    return computeDecisionSummary(
      "Selected corridor",
      "Summary unavailable, showing latest points.",
      routePoints
    );
  }, [corridorFocus, routeFilter, routePoints, corridorSummaryMap]);

  const handleViewDetails = React.useCallback((key: CorridorKey) => {
    setViewMode("list");
    setCorridorFocus(key);
    setRouteFilter(CORRIDOR_ROUTE_FILTER[key]);
    setSearchQuery(key === "CONNECTORS" ? CONNECTOR_QUERY : "");
    window.setTimeout(() => {
      document.getElementById("chain-control-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 200);
  }, []);

  const handleRouteChange = React.useCallback(
    (nextRoute: RouteFilter) => {
      setRouteFilter(nextRoute);
      setSearchQuery("");
      if (nextRoute === "All") {
        setCorridorFocus(null);
      } else {
        setCorridorFocus(ROUTE_TO_CORRIDOR[nextRoute]);
      }
    },
    []
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (corridorFocus === "CONNECTORS" && value !== CONNECTOR_QUERY) {
        setCorridorFocus(null);
      }
    },
    [corridorFocus]
  );

  const handleViewCorridorFromMap = React.useCallback(
    (key: CorridorKey) => {
      setCorridorFocus(key);
      setRouteFilter(CORRIDOR_ROUTE_FILTER[key]);
      setSearchQuery("");
    },
    []
  );

  const handleJumpToTable = React.useCallback(
    (point: ChainControlPoint) => {
      const corridorKey = getCorridorKeyForRoute(point.route);
      const nextRoute =
        point.route === "I-80" || point.route === "US-50" || point.route === "SR-88"
          ? (point.route as RouteFilter)
          : "All";

      setViewMode("list");
      setRouteFilter(nextRoute);
      setSearchQuery("");
      setCorridorFocus(corridorKey);
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

  const handleOpenDetailsFromMap = React.useCallback(() => {
    if (routeFilter === "All") {
      setViewMode("list");
      setRouteFilter("All");
      setSearchQuery("");
      setCorridorFocus(null);
      window.setTimeout(() => {
        document.getElementById("chain-control-table")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 200);
      return;
    }

    handleViewDetails(ROUTE_TO_CORRIDOR[routeFilter]);
  }, [handleViewDetails, routeFilter]);

  const handleViewPointFromPanel = React.useCallback((point: ChainControlPoint) => {
    setSelectedPoint(point);
  }, []);

  const statusSummary = searchQuery.trim()
    ? `${visiblePoints.length} results on ${routeFilter}`
    : routePoints.length
      ? `${routePoints.length} control points on ${routeFilter}`
      : `No active controls found for ${routeFilter}`;

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
            <Button variant="secondary" size="sm" onClick={fetchData} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh now"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {updatedAt
                ? `Last refreshed ${formatTimestamp(updatedAt)}`
                : "Waiting for first refresh..."}
            </span>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Feed connection issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="list">Details</TabsTrigger>
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
              onOpenDetails={handleOpenDetailsFromMap}
            />
            <Card className="relative overflow-hidden border-border/60">
              <CardContent className="p-0">
                <div className="relative h-[60vh] min-h-[320px] sm:h-[70vh] sm:min-h-[420px]">
                  <ChainControlMap
                    points={routePoints}
                    selectedPoint={selectedPoint}
                    onSelectPoint={setSelectedPoint}
                    fitKey={routeFilter}
                    mapStyleUrl={mapStyle.url}
                  />

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
                          onClick={fetchData}
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? "Refreshing..." : "Refresh now"}
                        </Button>
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
                  <Button variant="secondary" size="sm" onClick={fetchData} disabled={isRefreshing}>
                    {isRefreshing ? "Refreshing..." : "Refresh now"}
                  </Button>
                </div>

                <Separator />
                <MapLegend />
              </SheetContent>
            </Sheet>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <CorridorSafety
              summaries={corridorSummaries}
              onViewDetails={handleViewDetails}
              isRefreshing={isRefreshing}
            />

            <Tabs value={direction} onValueChange={(value) => setDirection(value as Direction)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="bay-to-tahoe">Bay → Tahoe</TabsTrigger>
                <TabsTrigger value="tahoe-to-bay">Tahoe → Bay</TabsTrigger>
              </TabsList>

              <TabsContent value="bay-to-tahoe" className="space-y-6">
                <DirectionPanel
                  direction="bay-to-tahoe"
                  routeFilter={routeFilter}
                  onRouteChange={handleRouteChange}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  statusSummary={statusSummary}
                  decisionSummary={decisionSummary}
                  directionCallout={DIRECTION_CALLOUT["bay-to-tahoe"]}
                  latestRecord={latestRecord}
                  latestStatus={latestStatus}
                  updatedAt={updatedAt}
                  isRefreshing={isRefreshing}
                  isLoading={isLoading}
                  onRefresh={fetchData}
                  points={visiblePoints}
                />
              </TabsContent>
              <TabsContent value="tahoe-to-bay" className="space-y-6">
                <DirectionPanel
                  direction="tahoe-to-bay"
                  routeFilter={routeFilter}
                  onRouteChange={handleRouteChange}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  statusSummary={statusSummary}
                  decisionSummary={decisionSummary}
                  directionCallout={DIRECTION_CALLOUT["tahoe-to-bay"]}
                  latestRecord={latestRecord}
                  latestStatus={latestStatus}
                  updatedAt={updatedAt}
                  isRefreshing={isRefreshing}
                  isLoading={isLoading}
                  onRefresh={fetchData}
                  points={visiblePoints}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

interface DirectionPanelProps {
  direction: Direction;
  routeFilter: RouteFilter;
  onRouteChange: (route: RouteFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusSummary: string;
  decisionSummary: DecisionSummary;
  directionCallout: string;
  latestRecord: string | null;
  latestStatus: string | null;
  updatedAt: string | null;
  isRefreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  points: ChainControlPoint[];
}

function DirectionPanel({
  direction,
  routeFilter,
  onRouteChange,
  searchQuery,
  onSearchChange,
  statusSummary,
  decisionSummary,
  directionCallout,
  latestRecord,
  latestStatus,
  updatedAt,
  isRefreshing,
  isLoading,
  onRefresh,
  points
}: DirectionPanelProps) {
  const directionLabel =
    direction === "bay-to-tahoe"
      ? "Leaving the Bay Area toward Tahoe"
      : "Returning to the Bay Area from Tahoe";

  return (
    <section className="space-y-6">
      <Card className="border-transparent bg-white/70 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">{directionLabel}</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">{statusSummary}</span>
            <span className="block text-xs text-muted-foreground">{directionCallout}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Choose a route</p>
              <RouteSelector value={routeFilter} onChange={onRouteChange} />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh now"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              <p>
                <span className="font-medium text-foreground">Last record update:</span>{" "}
                {formatTimestamp(latestRecord)}
              </p>
              <p>
                <span className="font-medium text-foreground">Last status update:</span>{" "}
                {formatTimestamp(latestStatus)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {updatedAt ? `Fetched ${formatTimestamp(updatedAt)}` : "Fetching latest data..."}
            </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">Legend:</span> R-0 no controls, R-1
              chains required except 4WD/AWD with snow tires (must carry), R-2 chains required on
              all vehicles except 4WD/AWD with snow tires (must carry), R-3 chains required on all
              vehicles, no exceptions, RC road closed.
            </div>
            <div>
              <span className="font-medium text-foreground">Special:</span> ESC escort, HT hold,
              TS traffic stop, TTA temporary traffic alert.
            </div>
          </div>
        </CardContent>
      </Card>

      <DecisionBanner summary={decisionSummary} directionCallout={directionCallout} />

      <Card id="chain-control-table" className="animate-in fade-in-0">
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Chain control points</CardTitle>
              <CardDescription>
                {isLoading ? "Loading live updates..." : `${points.length} results`}
              </CardDescription>
            </div>
            <div className="w-full md:w-72">
              <Input
                placeholder="Search location, route, county"
                value={searchQuery}
                aria-label="Search chain control points"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No control points match that search."
                : "No active controls found for this route right now."}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {points.map((point) => (
                  <MobilePointCard key={`card-${point.index}`} point={point} />
                ))}
              </div>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                                aria-label="Why chain control status matters"
                              >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                Why this matters
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="max-w-xs text-xs">
                              <div className="space-y-1">
                                <p>
                                  <span className="font-semibold">R-1:</span> Chains required
                                  except 4WD/AWD with snow tires (must carry).
                                </p>
                                <p>
                                  <span className="font-semibold">R-2:</span> Chains required on
                                  all vehicles except 4WD/AWD with snow tires (must carry).
                                </p>
                                <p>
                                  <span className="font-semibold">R-3:</span> Chains required on
                                  all vehicles, no exceptions.
                                </p>
                                <p>
                                  <span className="font-semibold">RC:</span> Road closed.
                                </p>
                                <p>
                                  <span className="font-semibold">HT:</span> All traffic held at
                                  checkpoint.
                                </p>
                                <p>
                                  <span className="font-semibold">ESC:</span> CHP escorting traffic.
                                </p>
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
                    {points.map((point) => {
                      const severity = getSeverityForStatus(point.status);
                      const updated = point.statusTimestamp ?? point.recordTimestamp;
                      return (
                        <TableRow key={point.index} id={`row-${point.index}`}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", STATUS_BADGE_CLASSES[severity])}
                            >
                              {point.status || "Unknown"}
                            </Badge>
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
                            {point.statusDescription || "No additional notes."}
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
    </section>
  );
}

interface RouteSelectorProps {
  value: RouteFilter;
  onChange: (value: RouteFilter) => void;
}

function RouteSelector({ value, onChange }: RouteSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as RouteFilter)}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {ROUTE_FILTERS.map((route) => (
        <div key={route} className="flex items-center">
          <RadioGroupItem
            value={route}
            id={`route-${route}`}
            className="peer sr-only"
          />
          <Label
            htmlFor={`route-${route}`}
            className="flex w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
          >
            {route === "All" && "All"}
            {route === "I-80" && "I-80 (Donner Pass)"}
            {route === "US-50" && "US-50 (Echo Summit)"}
            {route === "SR-88" && "SR-88 (Carson Pass)"}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function MobilePointCard({ point }: { point: ChainControlPoint }) {
  const severity = getSeverityForStatus(point.status);
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
            {point.status || "Unknown"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(updated)}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{routeLabel}</p>
          <p className="text-sm text-foreground">{point.locationName}</p>
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
