import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { formatNumber } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { ListResponse, Outcome, OutcomesByZip } from "../types";

type SortColumn = "zipCode" | "peopleServed" | "outcomeCount" | "grantCount";
type SortDirection = "asc" | "desc";

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

interface ColumnSpec {
  key: SortColumn;
  label: string;
  /** Numbers read best largest-first; a zip code reads best in order. */
  defaultDirection: SortDirection;
}

const COLUMNS: readonly ColumnSpec[] = [
  { key: "zipCode", label: "Zip", defaultDirection: "asc" },
  { key: "peopleServed", label: "People served", defaultDirection: "desc" },
  { key: "outcomeCount", label: "Outcomes", defaultDirection: "desc" },
  { key: "grantCount", label: "Grants", defaultDirection: "desc" },
];

function compareRows(
  left: OutcomesByZip,
  right: OutcomesByZip,
  column: SortColumn,
): number {
  switch (column) {
    case "zipCode":
      return left.zipCode.localeCompare(right.zipCode);
    case "peopleServed":
      return (left.peopleServed ?? 0) - (right.peopleServed ?? 0);
    case "outcomeCount":
      return left.outcomeCount - right.outcomeCount;
    case "grantCount":
      return left.grantCount - right.grantCount;
  }
}

function sortRows(
  rows: readonly OutcomesByZip[],
  sort: SortState,
): OutcomesByZip[] {
  const sorted: OutcomesByZip[] = [...rows].sort((left, right) =>
    compareRows(left, right, sort.column),
  );
  return sort.direction === "asc" ? sorted : sorted.reverse();
}

/**
 * The by-zip rollup from the whiteboard, with the raw records underneath.
 *
 * Clicking a zip filters the records below it; the filter lives in the URL so
 * a filtered view can be shared, matching the grants list. Sorting is local
 * state — it's how someone is reading the table right now, not what they're
 * looking at.
 */
export function OutcomesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedZip: string = searchParams.get("zip") ?? "";

  const [sort, setSort] = useState<SortState>({
    column: "peopleServed",
    direction: "desc",
  });

  const byZip = useApiResource<ListResponse<OutcomesByZip>>(
    () => api.getOutcomesByZip(),
    [],
  );
  const outcomes = useApiResource<ListResponse<Outcome>>(
    () => api.listOutcomes(selectedZip === "" ? {} : { zipCode: selectedZip }),
    [selectedZip],
  );

  const totalPeopleServed: number = (byZip.data?.items ?? []).reduce(
    (sum, row) => sum + (row.peopleServed ?? 0),
    0,
  );

  /** Clicking the zip already selected clears the filter. */
  function toggleZip(zipCode: string): void {
    const next = new URLSearchParams(searchParams);
    if (selectedZip === zipCode) {
      next.delete("zip");
    } else {
      next.set("zip", zipCode);
    }
    setSearchParams(next, { replace: true });
  }

  function clearZip(): void {
    const next = new URLSearchParams(searchParams);
    next.delete("zip");
    setSearchParams(next, { replace: true });
  }

  function toggleSort(column: SortColumn): void {
    setSort((previous) => {
      if (previous.column === column) {
        return {
          column,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }
      const spec = COLUMNS.find((candidate) => candidate.key === column);
      return { column, direction: spec?.defaultDirection ?? "desc" };
    });
  }

  const rows: OutcomesByZip[] = sortRows(byZip.data?.items ?? [], sort);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Outcomes</h1>
          <p className="page-head__subtitle">
            {formatNumber(totalPeopleServed)} people served across{" "}
            {byZip.data?.items.length ?? 0} zip codes
          </p>
        </div>
        <div className="page-head__actions">
          <Link className="button button--primary" to="/outcomes/new">
            Record outcome
          </Link>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">By zip code</h2>
          <span className="panel__hint">
            Click a zip to filter the records below · click a column to sort
          </span>
        </div>

        {byZip.isLoading ? <StateMessage title="Loading rollup…" /> : null}
        {byZip.error ? <ApiErrorMessage error={byZip.error} /> : null}

        {byZip.data && byZip.data.items.length === 0 ? (
          <p className="muted">No outcomes recorded yet.</p>
        ) : null}

        {rows.length > 0 ? (
          <table className="table table--interactive">
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const isSorted: boolean = sort.column === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        isSorted
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className={
                          isSorted ? "table__sort table__sort--active" : "table__sort"
                        }
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.label}
                        <span aria-hidden="true" className="table__sort-arrow">
                          {isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected: boolean = row.zipCode === selectedZip;
                return (
                  <tr key={row.zipCode} className={isSelected ? "table__row--selected" : ""}>
                    <td>
                      <button
                        type="button"
                        className="table__filter-link"
                        aria-pressed={isSelected}
                        onClick={() => toggleZip(row.zipCode)}
                      >
                        {row.zipCode}
                      </button>
                    </td>
                    <td>{formatNumber(row.peopleServed)}</td>
                    <td>{row.outcomeCount}</td>
                    <td>{row.grantCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            All records
            {outcomes.data ? (
              <span className="muted muted--inline">
                {outcomes.data.total} shown
              </span>
            ) : null}
          </h2>
          {selectedZip !== "" ? (
            <button type="button" className="chip chip--selected" onClick={clearZip}>
              Zip {selectedZip} ✕
            </button>
          ) : null}
        </div>

        {outcomes.isLoading ? <StateMessage title="Loading outcomes…" /> : null}
        {outcomes.error ? <ApiErrorMessage error={outcomes.error} /> : null}

        {outcomes.data && outcomes.data.items.length === 0 ? (
          <StateMessage title={`No outcomes in ${selectedZip || "any zip"}`}>
            <p>
              {selectedZip === "" ? (
                "Record one and it shows up here."
              ) : (
                <button type="button" className="link-button" onClick={clearZip}>
                  Show every zip
                </button>
              )}
            </p>
          </StateMessage>
        ) : null}

        {outcomes.data && outcomes.data.items.length > 0 ? (
          <ul className="record-list">
            {outcomes.data.items.map((outcome) => (
              <li
                key={outcome.outcomeId}
                className="record-list__item record-list__item--block"
              >
                <div className="record-list__row">
                  <span className="record-list__title">
                    {formatNumber(outcome.peopleServed)} people served
                  </span>
                  <button
                    type="button"
                    className="pill pill--button"
                    aria-pressed={outcome.zipCode === selectedZip}
                    onClick={() => toggleZip(outcome.zipCode)}
                  >
                    {outcome.zipCode}
                  </button>
                  {outcome.socialStatus ? (
                    <span className="pill pill--quiet">{outcome.socialStatus}</span>
                  ) : null}
                  <Link className="record-list__link" to={`/grants/${outcome.grantId}`}>
                    View grant
                  </Link>
                </div>
                {outcome.result ? (
                  <p className="record-list__body">{outcome.result}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
