import {
  type CaltransFeed,
  type ChainControlPoint,
  type CorridorKey,
  type CorridorLabel,
  type CorridorReason,
  type CorridorSeverity,
  type CorridorSummary,
  type DecisionSummary,
  type SeverityLevel
} from "@/lib/types";

const TIME_ZONE = "America/Los_Angeles";

const HOLD_KEYWORDS = ["ESC", "HT", "TS", "TTA", "HOLD", "ESCORT", "CLOSED", "CLOSURE"];
const INFO_KEYWORDS = ["MIN", "MAX"];

const ROUTES_ALL = new Set([
  "I-80",
  "US-50",
  "SR-88",
  "SR-89",
  "SR-28",
  "CA-28",
  "SR-267"
]);

const CORRIDOR_DEFINITIONS: Record<
  CorridorKey,
  { title: string; subtitle: string; routes: string[] }
> = {
  I80: {
    title: "I-80 (Donner Pass)",
    subtitle: "Primary Sierra crossing between the Bay and Tahoe.",
    routes: ["I-80"]
  },
  US50: {
    title: "US-50 (Echo Summit)",
    subtitle: "South shore access via Echo Summit.",
    routes: ["US-50"]
  },
  SR88: {
    title: "SR-88 (Carson Pass)",
    subtitle: "Carson Pass corridor toward the West Slope.",
    routes: ["SR-88"]
  },
  CONNECTORS: {
    title: "Around Tahoe / Connectors",
    subtitle: "SR-89, SR-267, and SR-28 connectors around the lake.",
    routes: ["SR-89", "SR-267", "SR-28", "CA-28"]
  }
};

export const CORRIDOR_ORDER: CorridorKey[] = [
  "I80",
  "US50",
  "SR88",
  "CONNECTORS"
];

export function getCorridorKeyForRoute(route: string): CorridorKey | null {
  const entry = (Object.entries(CORRIDOR_DEFINITIONS) as Array<
    [CorridorKey, { routes: string[] }]
  >).find(([, definition]) => definition.routes.includes(route));

  return entry?.[0] ?? null;
}

export const SEVERITY_RANK: Record<SeverityLevel, number> = {
  good: 0,
  caution: 1,
  chains: 2,
  avoid: 3
};

const CORRIDOR_SEVERITY_RANK: Record<CorridorSeverity, number> = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

const CORRIDOR_LABELS: Record<CorridorSeverity, CorridorLabel> = {
  GREEN: "Good to go",
  YELLOW: "Use caution",
  ORANGE: "Chains likely needed",
  RED: "Avoid / Delay"
};

const STATUS_TO_SEVERITY_LEVEL: Record<CorridorSeverity, SeverityLevel> = {
  GREEN: "good",
  YELLOW: "caution",
  ORANGE: "chains",
  RED: "avoid"
};

const toNumber = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const combineDateTime = (date?: string, time?: string) => {
  if (!date || !time) {
    return null;
  }
  return `${date} ${time}`;
};

export const normalizeStatus = (status?: string | null) => {
  if (!status) {
    return "";
  }
  return status.toUpperCase().replace(/\s+/g, "");
};

const getTimeZoneOffset = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour);
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    hour === 24 ? 0 : hour,
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
};

export const parseTimestamp = (timestamp?: string | null) => {
  if (!timestamp) {
    return null;
  }

  if (timestamp.includes("T")) {
    const epoch = Date.parse(timestamp);
    return Number.isNaN(epoch) ? null : epoch;
  }

  const [datePart, timePart] = timestamp.split(" ");
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (
    [year, month, day, hour, minute].some((value) => Number.isNaN(value)) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0));
  const offset = getTimeZoneOffset(utcDate);
  return utcDate.getTime() - offset;
};

export const getPointUpdatedAt = (point: ChainControlPoint) => {
  return point.statusTimestamp ?? point.recordTimestamp;
};

export const getPointUpdatedEpoch = (point: ChainControlPoint) => {
  return parseTimestamp(getPointUpdatedAt(point));
};

const getMaxSeverity = (points: ChainControlPoint[]) => {
  return points.reduce<CorridorSeverity>((current, point) => {
    const severity = computePointSeverity(point);
    return CORRIDOR_SEVERITY_RANK[severity] > CORRIDOR_SEVERITY_RANK[current]
      ? severity
      : current;
  }, "GREEN");
};

export const ROUTE_FILTERS = ["All", "I-80", "US-50", "SR-88"] as const;

export type RouteFilter = (typeof ROUTE_FILTERS)[number];

export function normalizeFeed(feed: CaltransFeed): ChainControlPoint[] {
  if (!feed?.data) {
    return [];
  }

  return feed.data.flatMap((entry) => {
    const cc = entry?.cc;
    if (!cc || !cc.location || !cc.statusData) {
      return [];
    }

    return [
      {
        index: cc.index ?? "",
        district: cc.location.district ?? "",
        locationName: cc.location.locationName ?? "",
        nearbyPlace: cc.location.nearbyPlace ?? "",
        longitude: toNumber(cc.location.longitude),
        latitude: toNumber(cc.location.latitude),
        elevation: toNumber(cc.location.elevation),
        direction: cc.location.direction ?? "",
        county: cc.location.county ?? "",
        route: cc.location.route ?? "",
        status: cc.statusData.status ?? "",
        statusDescription: cc.statusData.statusDescription ?? "",
        statusTimestamp: combineDateTime(
          cc.statusData.statusTimestamp?.statusDate,
          cc.statusData.statusTimestamp?.statusTime
        ),
        recordTimestamp: combineDateTime(
          cc.recordTimestamp?.recordDate,
          cc.recordTimestamp?.recordTime
        )
      }
    ];
  });
}

const computeStatusSeverity = (status?: string | null): CorridorSeverity => {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return "RED";
  }

  if (normalized.startsWith("R-0") || normalized.startsWith("R0")) {
    return "GREEN";
  }
  if (normalized.startsWith("R-1") || normalized.startsWith("R1")) {
    return "YELLOW";
  }
  if (normalized.startsWith("R-2") || normalized.startsWith("R2")) {
    return "ORANGE";
  }
  if (
    normalized.startsWith("R-3") ||
    normalized.startsWith("R3") ||
    normalized === "RC"
  ) {
    return "RED";
  }

  if (HOLD_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "RED";
  }

  if (INFO_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "GREEN";
  }

  return "RED";
};

export function computePointSeverity(point: ChainControlPoint): CorridorSeverity {
  return computeStatusSeverity(point.status);
}

export function computeDecisionSummary(
  title: string,
  subtitle: string,
  points: ChainControlPoint[]
): DecisionSummary {
  const base = computeSummary(points);
  return {
    title,
    subtitle,
    severity: base.severity,
    label: base.label,
    score: base.score,
    reasons: base.reasons,
    points
  };
}

export function groupPointsByCorridor(
  points: ChainControlPoint[]
): Record<CorridorKey, ChainControlPoint[]> {
  const grouped: Record<CorridorKey, ChainControlPoint[]> = {
    I80: [],
    US50: [],
    SR88: [],
    CONNECTORS: []
  };

  points.forEach((point) => {
    const route = point.route;
    if (CORRIDOR_DEFINITIONS.I80.routes.includes(route)) {
      grouped.I80.push(point);
      return;
    }
    if (CORRIDOR_DEFINITIONS.US50.routes.includes(route)) {
      grouped.US50.push(point);
      return;
    }
    if (CORRIDOR_DEFINITIONS.SR88.routes.includes(route)) {
      grouped.SR88.push(point);
      return;
    }
    if (CORRIDOR_DEFINITIONS.CONNECTORS.routes.includes(route)) {
      grouped.CONNECTORS.push(point);
    }
  });

  return grouped;
}

export function computeCorridorSummary(
  key: CorridorKey,
  points: ChainControlPoint[]
): CorridorSummary {
  const definition = CORRIDOR_DEFINITIONS[key];
  const base = computeSummary(points);

  return {
    key,
    title: definition.title,
    subtitle: definition.subtitle,
    severity: base.severity,
    label: base.label,
    score: base.score,
    reasons: base.reasons,
    points
  };
}

export function formatReasonLine(reason: CorridorReason): string {
  if (!reason.status && reason.locationName) {
    return reason.locationName;
  }

  const nearText = reason.nearbyPlace ? ` near ${reason.nearbyPlace}` : "";
  const direction = formatDirection(reason.direction);
  const routeDirection = [reason.route, direction].filter(Boolean).join(" ");
  const routeText = routeDirection ? ` (${routeDirection})` : "";

  return `${reason.status} at ${reason.locationName}${nearText}${routeText}`;
}

export function formatDirection(direction?: string) {
  if (!direction) {
    return "";
  }
  const normalized = direction.toLowerCase();
  if (normalized.startsWith("east")) {
    return "EB";
  }
  if (normalized.startsWith("west")) {
    return "WB";
  }
  if (normalized.startsWith("north")) {
    return "NB";
  }
  if (normalized.startsWith("south")) {
    return "SB";
  }
  return direction;
}

export function getSeverityForStatus(status?: string | null): SeverityLevel {
  const severity = computeStatusSeverity(status);
  return STATUS_TO_SEVERITY_LEVEL[severity];
}

export function getOverallSeverity(points: ChainControlPoint[]): SeverityLevel {
  if (points.length === 0) {
    return "good";
  }

  return points.reduce<SeverityLevel>((current, point) => {
    const pointSeverity = getSeverityForStatus(point.status);
    return SEVERITY_RANK[pointSeverity] > SEVERITY_RANK[current]
      ? pointSeverity
      : current;
  }, "good");
}

export function filterPointsForRoute(
  points: ChainControlPoint[],
  route: RouteFilter
): ChainControlPoint[] {
  if (route === "All") {
    return points.filter((point) => ROUTES_ALL.has(point.route));
  }

  return points.filter((point) => point.route === route);
}

export function hasValidCoords(
  point: ChainControlPoint
): point is ChainControlPoint & { latitude: number; longitude: number } {
  const { latitude, longitude } = point;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  return true;
}

export function getUnmappedAlerts(
  points: ChainControlPoint[],
  routeFilter: RouteFilter
): ChainControlPoint[] {
  const filtered = filterPointsForRoute(points, routeFilter);

  return filtered
    .filter((point) => !hasValidCoords(point) && computePointSeverity(point) !== "GREEN")
    .sort((a, b) => {
      const severityDiff =
        CORRIDOR_SEVERITY_RANK[computePointSeverity(b)] -
        CORRIDOR_SEVERITY_RANK[computePointSeverity(a)];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return (getPointUpdatedEpoch(b) ?? 0) - (getPointUpdatedEpoch(a) ?? 0);
    });
}

export function sortPoints(points: ChainControlPoint[]): ChainControlPoint[] {
  return [...points].sort((a, b) => {
    const severityDiff =
      SEVERITY_RANK[getSeverityForStatus(b.status)] -
      SEVERITY_RANK[getSeverityForStatus(a.status)];
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

export function filterPointsByQuery(
  points: ChainControlPoint[],
  query: string
): ChainControlPoint[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return points;
  }

  return points.filter((point) => {
    const haystack = [
      point.locationName,
      point.nearbyPlace,
      point.county,
      point.route
    ]
      .join(" ")
      .toLowerCase();

    return tokens.some((token) => haystack.includes(token));
  });
}

export function getLatestTimestamp(
  points: ChainControlPoint[],
  key: "recordTimestamp" | "statusTimestamp"
): string | null {
  let latestValue: string | null = null;
  let latestEpoch = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    const timestamp = point[key];
    if (!timestamp) {
      return;
    }
    const epoch = parseTimestamp(timestamp);
    if (epoch !== null && epoch > latestEpoch) {
      latestEpoch = epoch;
      latestValue = timestamp;
    }
  });

  return latestValue;
}

export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Unknown";
  }

  const epoch = parseTimestamp(timestamp);
  if (epoch === null) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE
  }).format(new Date(epoch));
}

const computeSummary = (points: ChainControlPoint[]) => {
  const activePoints = points.filter((point) => computePointSeverity(point) !== "GREEN");
  const severity = activePoints.length === 0 ? "GREEN" : getMaxSeverity(activePoints);
  const label = CORRIDOR_LABELS[severity];

  let score = 100;
  if (severity === "YELLOW") {
    score = Math.min(score, 70);
  }
  if (severity === "ORANGE") {
    score = Math.min(score, 40);
  }
  if (severity === "RED") {
    score = Math.min(score, 10);
  }

  const additionalCount = Math.max(activePoints.length - 1, 0);
  score -= Math.min(additionalCount * 5, 20);

  const newestEpoch = points
    .map((point) => getPointUpdatedEpoch(point))
    .filter((epoch): epoch is number => epoch !== null)
    .reduce<number | null>((latest, current) => {
      if (latest === null || current > latest) {
        return current;
      }
      return latest;
    }, null);

  if (newestEpoch !== null && Date.now() - newestEpoch > 5 * 60 * 1000) {
    score -= 5;
  }

  score = Math.min(100, Math.max(0, score));

  let reasons: CorridorReason[] = [];

  if (activePoints.length === 0) {
    const updatedAt = formatTimestamp(
      getLatestTimestamp(points, "statusTimestamp") ??
        getLatestTimestamp(points, "recordTimestamp")
    );

    reasons = [
      {
        severity: "YELLOW",
        status: "",
        route: "",
        locationName: "No active chain controls reported right now.",
        updatedAt,
        statusDescription:
          "Conditions can change quickly - carry chains and recheck before departure."
      }
    ];

    return { severity, label, score, reasons };
  }

  const thresholdRank = CORRIDOR_SEVERITY_RANK[severity];
  type ReasonCandidate = CorridorReason & { updatedEpoch: number };
  const toReasonSeverity = (severity: CorridorSeverity): CorridorReason["severity"] => {
    if (severity === "RED") {
      return "RED";
    }
    if (severity === "ORANGE") {
      return "ORANGE";
    }
    return "YELLOW";
  };

  const reasonCandidates: ReasonCandidate[] = activePoints
    .filter((point) => {
      return CORRIDOR_SEVERITY_RANK[computePointSeverity(point)] >= thresholdRank;
    })
    .map((point) => {
      const severityLevel = computePointSeverity(point);
      return {
        severity: toReasonSeverity(severityLevel),
        status: point.status || "Unknown",
        route: point.route,
        locationName: point.locationName,
        nearbyPlace: point.nearbyPlace || undefined,
        direction: point.direction || undefined,
        county: point.county || undefined,
        updatedAt: formatTimestamp(getPointUpdatedAt(point)),
        updatedEpoch: getPointUpdatedEpoch(point) ?? 0,
        statusDescription: point.statusDescription || undefined
      };
    })
    .sort((a, b) => {
      const severityDiff =
        CORRIDOR_SEVERITY_RANK[b.severity] - CORRIDOR_SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return b.updatedEpoch - a.updatedEpoch;
    })
    .slice(0, 3);

  reasons = reasonCandidates.map(({ updatedEpoch: _updatedEpoch, ...reason }) => reason);

  return { severity, label, score, reasons };
};
