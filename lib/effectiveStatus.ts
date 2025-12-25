import type { ChainControlPoint, CorridorKey } from "@/lib/types";
import {
  filterPointsForRoute,
  formatDirection,
  getPointUpdatedEpoch,
  hasValidCoords,
  normalizeStatus
} from "@/lib/chainControls";
import type { RouteFilter } from "@/lib/chainControls";

export type VehicleMode = "car" | "truck";
export type Severity = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export type EffectiveReason = {
  code: string;
  text: string;
  severity: Severity;
  updatedAt: number;
  isTruckOnly?: boolean;
};

export type TruckAdvisory = {
  code: string;
  text: string;
  updatedAt: number;
};

export type EffectiveCorridor = {
  key: CorridorKey;
  title: string;
  severity: Severity;
  label: string;
  meaning: string;
  reasons: EffectiveReason[];
  truckAdvisories: TruckAdvisory[];
  lastUpdatedAt: number;
};

const CORRIDOR_CONFIG: Record<CorridorKey, { title: string; routes: string[] }> = {
  I80: { title: "I-80 (Donner Pass)", routes: ["I-80"] },
  US50: { title: "US-50 (Echo Summit)", routes: ["US-50"] },
  SR88: { title: "SR-88 (Carson Pass)", routes: ["SR-88"] },
  CONNECTORS: { title: "Tahoe Connectors", routes: ["SR-89", "SR-267", "SR-28", "CA-28"] }
};

const CORRIDOR_KEYS: CorridorKey[] = ["I80", "US50", "SR88", "CONNECTORS"];

const SEVERITY_LABELS: Record<Severity, string> = {
  GREEN: "Good to go",
  YELLOW: "Use caution",
  ORANGE: "Chains required",
  RED: "Do not go"
};

const SEVERITY_MEANINGS: Record<Severity, string> = {
  GREEN: "You can drive normally.",
  YELLOW: "Be careful. Bring chains.",
  ORANGE: "Chains are required for many cars.",
  RED: "Do not go. The road is closed or held."
};

const SEVERITY_RANK: Record<Severity, number> = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

const PASSENGER_CODES = new Set([
  "R-1",
  "R-2",
  "R-3",
  "RC",
  "HT",
  "ESC",
  "TTA"
]);

const TRUCK_ONLY_CODES = new Set(["TS", "MAX", "MIN", "TRUCK"]);

const STATUS_TEXT: Record<string, string> = {
  "R-0": "Road open",
  "R-1": "Chains required (some cars)",
  "R-2": "Chains required (most cars)",
  "R-3": "Chains required (all vehicles)",
  RC: "Road closed",
  HT: "Traffic held at checkpoint",
  ESC: "CHP escorting traffic",
  TTA: "Temporary traffic alert",
  TS: "Truck checkpoint",
  MAX: "Truck chains: maximum required",
  MIN: "Truck chains: minimum required",
  TRUCK: "Truck advisory",
  UNKNOWN: "Chain control alert"
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type PointMeta = {
  point: ChainControlPoint;
  code: string;
  updatedAt: number;
  locationKey: string;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

export function isTruckOnly(code: string): boolean {
  return TRUCK_ONLY_CODES.has(normalizeCode(code));
}

export function isPassengerImpacting(code: string): boolean {
  const normalized = normalizeCode(code);
  if (normalized === "R-0") {
    return false;
  }
  if (isTruckOnly(normalized)) {
    return false;
  }
  if (PASSENGER_CODES.has(normalized)) {
    return true;
  }
  return normalized.length > 0;
}

export function getStatusCode(status?: string | null): string {
  const raw = (status ?? "").trim().toUpperCase();
  const normalized = normalizeStatus(status);

  if (!raw && !normalized) {
    return "UNKNOWN";
  }

  if (normalized.startsWith("R-0") || normalized.startsWith("R0")) {
    return "R-0";
  }
  if (normalized.startsWith("R-1") || normalized.startsWith("R1")) {
    return "R-1";
  }
  if (normalized.startsWith("R-2") || normalized.startsWith("R2")) {
    return "R-2";
  }
  if (normalized.startsWith("R-3") || normalized.startsWith("R3")) {
    return "R-3";
  }

  if (/\bRC\b/.test(raw) || raw.includes("ROAD CLOSED") || raw.includes("CLOSED")) {
    return "RC";
  }
  if (/\bHT\b/.test(raw) || raw.includes("HOLD")) {
    return "HT";
  }
  if (/\bESC\b/.test(raw) || raw.includes("ESCORT")) {
    return "ESC";
  }
  if (/\bTTA\b/.test(raw)) {
    return "TTA";
  }
  if (/\bTS\b/.test(raw)) {
    return "TS";
  }
  if (/\bMAX\b/.test(raw) || raw.includes("MAXIMUM")) {
    return "MAX";
  }
  if (/\bMIN\b/.test(raw) || raw.includes("MINIMUM")) {
    return "MIN";
  }
  if (raw.includes("TRUCK") || raw.includes("COMMERCIAL")) {
    return "TRUCK";
  }

  return "UNKNOWN";
}

export function severityForCode(code: string, mode: VehicleMode): Severity {
  const normalized = normalizeCode(code);
  if (normalized === "R-0") {
    return "GREEN";
  }
  if (normalized === "R-1") {
    return "YELLOW";
  }
  if (normalized === "R-2") {
    return "ORANGE";
  }
  if (normalized === "R-3") {
    return "RED";
  }
  if (normalized === "RC" || normalized === "HT" || normalized === "ESC" || normalized === "TTA") {
    return "RED";
  }

  if (isTruckOnly(normalized)) {
    if (mode === "car") {
      return "GREEN";
    }
    if (normalized === "MIN") {
      return "YELLOW";
    }
    if (normalized === "MAX") {
      return "ORANGE";
    }
    return "RED";
  }

  return "RED";
}

export function getSeverityLabel(severity: Severity): string {
  return SEVERITY_LABELS[severity];
}

export function getSeverityMeaning(severity: Severity): string {
  return SEVERITY_MEANINGS[severity];
}

export function getStatusText(code: string): string {
  return STATUS_TEXT[normalizeCode(code)] ?? STATUS_TEXT.UNKNOWN;
}

const buildLocationKey = (point: ChainControlPoint) => {
  const direction = formatDirection(point.direction) || point.direction || "";
  const location = point.locationName.trim().toLowerCase();
  return `${point.route}:${direction}:${location}`;
};

const buildLocationLabel = (point: ChainControlPoint) => {
  const locationName = point.locationName?.trim();
  if (locationName) {
    return locationName;
  }
  const direction = formatDirection(point.direction);
  const routeLabel = direction ? `${point.route} ${direction}` : point.route;
  return routeLabel || "Unknown location";
};

const buildReasonText = (point: ChainControlPoint, code: string) => {
  const base = getStatusText(code);
  const location = buildLocationLabel(point);
  const nearby = point.nearbyPlace?.trim()
    ? ` near ${point.nearbyPlace.trim()}`
    : "";
  return `${base} at ${location}${nearby}.`;
};

const buildPointMeta = (point: ChainControlPoint): PointMeta => ({
  point,
  code: getStatusCode(point.status),
  updatedAt: getPointUpdatedEpoch(point) ?? 0,
  locationKey: buildLocationKey(point)
});

const dedupePoints = (points: ChainControlPoint[]) => {
  const map = new Map<string, PointMeta>();
  points.forEach((point) => {
    const meta = buildPointMeta(point);
    const key = `${meta.locationKey}:${meta.code}`;
    const existing = map.get(key);
    if (!existing || meta.updatedAt >= existing.updatedAt) {
      map.set(key, meta);
    }
  });
  return Array.from(map.values());
};

const filterStaleGreen = (metas: PointMeta[]) => {
  const newest = metas.reduce((max, meta) => Math.max(max, meta.updatedAt), 0);
  if (!newest) {
    return metas;
  }

  return metas.filter((meta) => {
    if (normalizeCode(meta.code) !== "R-0") {
      return true;
    }
    if (newest - meta.updatedAt <= ONE_DAY_MS) {
      return true;
    }
    const hasNewerNonGreen = metas.some(
      (other) =>
        other.locationKey === meta.locationKey &&
        normalizeCode(other.code) !== "R-0" &&
        other.updatedAt >= meta.updatedAt
    );
    return !hasNewerNonGreen;
  });
};

const sortBySeverityAndTime = <T extends { severity: Severity; updatedAt: number }>(
  items: T[]
) => {
  return [...items].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return b.updatedAt - a.updatedAt;
  });
};

const getDisplayPointMetas = (points: ChainControlPoint[], routeFilter: RouteFilter) => {
  const filtered = filterPointsForRoute(points, routeFilter);
  return filterStaleGreen(dedupePoints(filtered));
};

const summarizeCorridor = (
  points: ChainControlPoint[],
  mode: VehicleMode,
  key: CorridorKey
): EffectiveCorridor => {
  const base = filterStaleGreen(dedupePoints(points));
  const lastUpdatedAt = base.reduce((max, meta) => Math.max(max, meta.updatedAt), 0);

  const relevant = base.filter((meta) => {
    const severity = severityForCode(meta.code, mode);
    return severity !== "GREEN" && (mode === "truck" || !isTruckOnly(meta.code));
  });

  const severity =
    relevant.length === 0
      ? "GREEN"
      : relevant.reduce<Severity>((current, meta) => {
          const candidate = severityForCode(meta.code, mode);
          return SEVERITY_RANK[candidate] > SEVERITY_RANK[current] ? candidate : current;
        }, "GREEN");

  const reasons = sortBySeverityAndTime(
    relevant.map((meta) => ({
      code: meta.code,
      text: buildReasonText(meta.point, meta.code),
      severity: severityForCode(meta.code, mode),
      updatedAt: meta.updatedAt,
      isTruckOnly: isTruckOnly(meta.code)
    }))
  ).slice(0, 3);

  const truckAdvisories = base
    .filter((meta) => isTruckOnly(meta.code))
    .map((meta) => ({
      code: meta.code,
      text: buildReasonText(meta.point, meta.code),
      updatedAt: meta.updatedAt
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    key,
    title: CORRIDOR_CONFIG[key].title,
    severity,
    label: getSeverityLabel(severity),
    meaning: getSeverityMeaning(severity),
    reasons,
    truckAdvisories,
    lastUpdatedAt
  };
};

export function computeEffectiveCorridors(
  points: ChainControlPoint[],
  mode: VehicleMode
): EffectiveCorridor[] {
  return CORRIDOR_KEYS.map((key) => {
    const routes = CORRIDOR_CONFIG[key].routes;
    const corridorPoints = points.filter((point) => routes.includes(point.route));
    return summarizeCorridor(corridorPoints, mode, key);
  });
}

export function computeEffectiveForCorridor(
  points: ChainControlPoint[],
  key: CorridorKey,
  mode: VehicleMode
): EffectiveCorridor {
  const routes = CORRIDOR_CONFIG[key].routes;
  const corridorPoints = points.filter((point) => routes.includes(point.route));
  return summarizeCorridor(corridorPoints, mode, key);
}

export function getDisplayPoints(
  points: ChainControlPoint[],
  routeFilter: RouteFilter
): ChainControlPoint[] {
  return getDisplayPointMetas(points, routeFilter).map((meta) => meta.point);
}

export function getMapPoints(
  points: ChainControlPoint[],
  routeFilter: RouteFilter,
  mode: VehicleMode,
  showTruckAdvisories: boolean
): ChainControlPoint[] {
  return getDisplayPointMetas(points, routeFilter)
    .filter((meta) => {
      if (mode === "car" && isTruckOnly(meta.code)) {
        return showTruckAdvisories;
      }
      const severity = severityForCode(meta.code, mode);
      if (severity === "GREEN") {
        return false;
      }
      return true;
    })
    .map((meta) => meta.point);
}

export function getUnmappedAlerts(
  points: ChainControlPoint[],
  routeFilter: RouteFilter,
  mode: VehicleMode
): ChainControlPoint[] {
  return getDisplayPointMetas(points, routeFilter)
    .filter((meta) => {
      if (hasValidCoords(meta.point)) {
        return false;
      }
      const severity = severityForCode(meta.code, mode);
      if (severity === "GREEN") {
        return false;
      }
      if (mode === "car" && isTruckOnly(meta.code)) {
        return false;
      }
      return true;
    })
    .map((meta) => ({
      meta,
      severity: severityForCode(meta.code, mode)
    }))
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return (b.meta.updatedAt ?? 0) - (a.meta.updatedAt ?? 0);
    })
    .map((entry) => entry.meta.point);
}

export function getPointSeverity(point: ChainControlPoint, mode: VehicleMode): Severity {
  const code = getStatusCode(point.status);
  return severityForCode(code, mode);
}

export function getPointStatusLabel(point: ChainControlPoint): string {
  const code = getStatusCode(point.status);
  return getStatusText(code);
}

export function getPointCode(point: ChainControlPoint): string {
  return getStatusCode(point.status);
}

export function sortPointsForMode(
  points: ChainControlPoint[],
  mode: VehicleMode
): ChainControlPoint[] {
  return [...points].sort((a, b) => {
    const severityDiff =
      SEVERITY_RANK[getPointSeverity(b, mode)] - SEVERITY_RANK[getPointSeverity(a, mode)];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    const routeCompare = a.route.localeCompare(b.route);
    if (routeCompare !== 0) {
      return routeCompare;
    }
    return a.locationName.localeCompare(b.locationName);
  });
}
