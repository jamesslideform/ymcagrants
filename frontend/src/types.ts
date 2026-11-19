/**
 * Domain types for the proof of concept, mirroring docs/api-contract.md.
 *
 * When the contract changes, change it here in the same pull request.
 */

/** Money crosses the wire as a decimal string so nothing rounds in transit. */
export type DecimalString = string;

/** Calendar date, "YYYY-MM-DD". */
export type IsoDate = string;

/** A grant as the form submits it and the API returns it. */
export interface Grant {
  grantId: string;
  name: string;
  funder: string;
  submissionDate: IsoDate | null;
  startDate: IsoDate | null;
  lengthMonths: number | null;
  dueDate: IsoDate | null;
  amountRequested: DecimalString | null;
  amountReceived: DecimalString | null;
  createdAt: string;
}

/** What POST /api/grants accepts. Only name and funder are required. */
export interface GrantInput {
  name: string;
  funder: string;
  submissionDate?: IsoDate | null;
  startDate?: IsoDate | null;
  lengthMonths?: number | null;
  dueDate?: IsoDate | null;
  amountRequested?: DecimalString | null;
  amountReceived?: DecimalString | null;
}

/**
 * One outcome recorded against a grant.
 *
 * Every field describes a group in a zip code, never an individual:
 * `socialStatus` is a category and `peopleServed` is a count.
 */
export interface Outcome {
  outcomeId: string;
  grantId: string;
  peopleServed: number | null;
  socialStatus: string | null;
  zipCode: string;
  descriptionOfFunding: string | null;
  result: string | null;
  createdAt: string;
}

/** What POST /api/outcomes accepts. grantId and zipCode are required. */
export interface OutcomeInput {
  grantId: string;
  zipCode: string;
  peopleServed?: number | null;
  socialStatus?: string | null;
  descriptionOfFunding?: string | null;
  result?: string | null;
}

/** A grant with the outcomes reported against it. */
export interface GrantWithOutcomes extends Grant {
  outcomes: Outcome[];
}

/** One row of the outcomes-by-zip view. */
export interface OutcomesByZip {
  zipCode: string;
  /** Sum of peopleServed across this zip's outcomes. */
  peopleServed: number | null;
  outcomeCount: number;
  /** Distinct grants contributing to this zip. */
  grantCount: number;
}

/** Every list endpoint answers with this shape, so paging can be added later. */
export interface ListResponse<T> {
  items: T[];
  total: number;
}
