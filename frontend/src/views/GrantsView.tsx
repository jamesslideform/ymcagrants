import { useState } from "react";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { formatDate, formatMoney } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { Grant, GrantStatus, ListResponse } from "../types";

const STATUS_FILTERS: ReadonlyArray<{ value: GrantStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "submitted", label: "Submitted" },
  { value: "prospect", label: "Prospect" },
  { value: "closed", label: "Closed" },
];

/** Phase 1: the list Kelly opens, and the place the entry form will live. */
export function GrantsView() {
  const [status, setStatus] = useState<GrantStatus | "all">("active");

  const { data, error, isLoading } = useApiResource<ListResponse<Grant>>(
    () => api.listGrants(status === "all" ? {} : { status }),
    [status],
  );

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="filter-group" role="group" aria-label="Filter grants by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={
                filter.value === status ? "chip chip--selected" : "chip"
              }
              aria-pressed={filter.value === status}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button type="button" className="button button--primary" disabled>
          New grant
        </button>
      </div>

      {isLoading ? <StateMessage title="Loading grants…" /> : null}
      {error ? <ApiErrorMessage error={error} /> : null}

      {data && data.items.length === 0 ? (
        <StateMessage title="No grants yet">
          <p>Once the backend is up, this is where every award lands.</p>
        </StateMessage>
      ) : null}

      {data && data.items.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Grant</th>
              <th scope="col">Funder</th>
              <th scope="col">Amount</th>
              <th scope="col">Period</th>
              <th scope="col">Next deadline</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((grant) => (
              <tr key={grant.id}>
                <td>
                  <span className="table__primary">{grant.title}</span>
                  {grant.programs.length > 0 ? (
                    <span className="muted">
                      {grant.programs.map((program) => program.name).join(" · ")}
                    </span>
                  ) : null}
                </td>
                <td>{grant.funder.name}</td>
                <td>{formatMoney(grant.awardAmount)}</td>
                <td className="muted">
                  {formatDate(grant.periodStart)} – {formatDate(grant.periodEnd)}
                </td>
                <td>
                  {grant.nextDeadline ? (
                    <>
                      <span className="table__primary">
                        {formatDate(grant.nextDeadline.dueDate)}
                      </span>
                      <span className="muted">{grant.nextDeadline.title}</span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
