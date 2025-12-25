export interface CaltransRecordTimestamp {
  recordDate?: string;
  recordTime?: string;
}

export interface CaltransStatusTimestamp {
  statusDate?: string;
  statusTime?: string;
}

export interface CaltransLocation {
  district?: string;
  locationName?: string;
  nearbyPlace?: string;
  longitude?: string;
  latitude?: string;
  elevation?: string;
  direction?: string;
  county?: string;
  route?: string;
  routeSuffix?: string;
  postmilePrefix?: string;
  postmile?: string;
  alignment?: string;
  milepost?: string;
}

export interface CaltransStatusData {
  statusTimestamp?: CaltransStatusTimestamp;
  status?: string;
  statusDescription?: string;
}

export interface CaltransCc {
  index?: string;
  recordTimestamp?: CaltransRecordTimestamp;
  location?: CaltransLocation;
  inService?: string;
  statusData?: CaltransStatusData;
}

export interface CaltransFeedEntry {
  cc?: CaltransCc;
}

export interface CaltransFeed {
  data?: CaltransFeedEntry[];
}

export interface ChainControlPoint {
  index: string;
  district: string;
  locationName: string;
  nearbyPlace: string;
  longitude: number | null;
  latitude: number | null;
  elevation: number | null;
  direction: string;
  county: string;
  route: string;
  status: string;
  statusDescription: string;
  statusTimestamp: string | null;
  recordTimestamp: string | null;
}

export type SeverityLevel = "good" | "caution" | "chains" | "avoid";

export type CorridorKey = "I80" | "US50" | "SR88" | "CONNECTORS";

export type CorridorSeverity = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export type CorridorLabel =
  | "Good to go"
  | "Use caution"
  | "Chains likely needed"
  | "Avoid / Delay";

export interface CorridorReason {
  severity: "YELLOW" | "ORANGE" | "RED";
  status: string;
  route: string;
  locationName: string;
  nearbyPlace?: string;
  direction?: string;
  county?: string;
  updatedAt: string;
  statusDescription?: string;
}

export interface CorridorSummary {
  key: CorridorKey;
  title: string;
  subtitle: string;
  severity: CorridorSeverity;
  label: CorridorLabel;
  score: number;
  reasons: CorridorReason[];
  points: ChainControlPoint[];
}

export type DecisionSummary = Omit<CorridorSummary, "key">;

export interface ChainControlResponse {
  updatedAt: string;
  points: ChainControlPoint[];
}
