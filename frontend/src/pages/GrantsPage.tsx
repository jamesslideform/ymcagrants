import { Link, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatMoney } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { Grant, GrantStatus, ListResponse } from "../types";
import { GRANT_STATUSES, GRANT_STATUS_LABELS } from "../types";

/**
 * Every grant, filterable. Status and search live in the URL so a filtered
 * view can be bookmarked or pasted into a message.
 */
export function GrantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status: string = searchParams.get("status") ?? "";
  const query: string = searchParams.get("q") ?? "";

  const { data, error, isLoading } = useApiResource<ListResponse<Grant>>(
    () =>
      api.listGrants({
        status: status === "" ? undefined : (status as GrantStatus),
        q: query === "" ? undefined : query,
      }),
    [status, query],
  );

  function setParam(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Grants</h1>
          <p className="page-head__subtitle">
            {data ? `${data.total} shown` : "Loading…"}
          </p>
        </div>
        <div className="page-head__actions">
          <Link className="button button--primary" to="/grants/new">
            Add grant
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-group" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={status === "" ? "chip chip--selected" : "chip"}
            aria-pressed={status === ""}
            onClick={() => setParam("status", "")}
          >
            All
          </button>
          {GRANT_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              className={status === option ? "chip chip--selected" : "chip"}
              aria-pressed={status === option}
              onClick={() => setParam("status", option)}
            >
              {GRANT_STATUS_LABELS[option]}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="field__input field__input--search"
          placeholder="Search name or funder…"
          aria-label="Search grants"
          value={query}
          onChange={(event) => setParam("q", event.target.value)}
        />
      </div>

      {isLoading ? <StateMessage title="Loading grants…" /> : null}
      {error ? <ApiErrorMessage error={error} /> : null}

      {data && data.items.length === 0 ? (
        <StateMessage title="No grants match">
          <p>Clear the filters, or add the first grant.</p>
        </StateMessage>
      ) : null}

      {data && data.items.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Grant</th>
              <th scope="col">Status</th>
              <th scope="col">Requested</th>
              <th scope="col">Received</th>
              <th scope="col">Report due</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((grant) => (
              <tr key={grant.grantId}>
                <td>
                  <Link to={`/grants/${grant.grantId}`} className="table__primary">
                    {grant.name}
                  </Link>
                  <span className="muted">{grant.funder}</span>
                </td>
                <td>
                  <StatusBadge status={grant.status} />
                </td>
                <td>{formatMoney(grant.amountRequested)}</td>
                <td>{formatMoney(grant.amountReceived)}</td>
                <td className="muted muted--cell">{formatDate(grant.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
