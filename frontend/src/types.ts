/**
 * Domain types, mirroring docs/data-model.md and docs/api-contract.md.
 *
 * When the contract changes, change it here in the same pull request.
 */

/** Money crosses the wire as a decimal string so nothing rounds in transit. */
export type DecimalString = string;

/** ISO-8601 calendar date, e.g. "2026-03-31". */
export type IsoDate = string;

export type GrantStatus =
  | "prospect"
  | "submitted"
  | "active"
  | "closed"
  | "declined";

export type MeasureValueType =
  | "count"
  | "currency"
  | "percent"
  | "boolean"
  | "narrative";

export type MeasureCadence = "monthly" | "quarterly" | "annual" | "grant_term";

export type DeliverableStatus = "not_started" | "in_progress" | "submitted";

export interface Funder {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Deliverable {
  id: string;
  grantId: string;
  title: string;
  dueDate: IsoDate;
  status: DeliverableStatus;
}

export interface Grant {
  id: string;
  title: string;
  funder: Pick<Funder, "id" | "name">;
  awardAmount: DecimalString | null;
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  status: GrantStatus;
  programs: Array<Pick<Program, "id" | "name">>;
  nextDeadline: Pick<Deliverable, "id" | "title" | "dueDate"> | null;
}

/** A reusable outcome question from the shared measure library. */
export interface MeasureDefinition {
  id: string;
  name: string;
  questionText: string;
  valueType: MeasureValueType;
  unit: string | null;
  /** A category such as "youth 6-12" — never an individual. */
  population: string | null;
  isShared: boolean;
}

/** Progress toward one grant's target for one measure. */
export interface OutcomeSummary {
  grantMeasureId: string;
  name: string;
  valueType: MeasureValueType;
  unit: string | null;
  targetValue: DecimalString | null;
  currentValue: DecimalString | null;
  percentOfTarget: number | null;
  cadence: MeasureCadence;
  lastRecordedPeriodEnd: IsoDate | null;
  /** True when a reporting period in range has no recorded value. */
  hasGaps: boolean;
}

export interface Measurement {
  id: string;
  grantMeasureId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  numericValue: DecimalString | null;
  booleanValue: boolean | null;
  textValue: string | null;
  isEstimated: boolean;
  sourceNote: string | null;
  recordedBy: string | null;
}

/** The default leadership view, in one request. */
export interface DashboardSummary {
  activeFundingTotal: DecimalString;
  activeGrantCount: number;
  deadlinesNext60Days: Deliverable[];
  peopleServedYearToDate: number | null;
  outcomeProgress: OutcomeSummary[];
}

/**
 * A stored analysis: filters, grouping, and chart choice. The app renders it and
 * the MCP server writes the same object, so neither side gets a private path to
 * the data.
 */
export interface SavedView {
  id: string;
  name: string;
  definition: SavedViewDefinition;
  createdBy: string;
  isPinned: boolean;
}

export interface SavedViewDefinition {
  metric: string;
  measureDefinitionId?: string;
  groupBy?: "program" | "funder" | "period" | "population";
  filters?: {
    status?: GrantStatus[];
    funderId?: string;
    programId?: string;
    periodStart?: IsoDate;
    periodEnd?: IsoDate;
  };
  chart?: "bar" | "line" | "table";
}

/** Every list endpoint answers with this shape, so paging can be added later. */
export interface ListResponse<T> {
  items: T[];
  total: number;
}
