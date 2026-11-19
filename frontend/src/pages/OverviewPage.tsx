import { Link } from "react-router-dom";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatMoney, formatNumber } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { OverviewSummary, UpcomingDeadline } from "../types";
import { GRANT_STATUS_LABELS } from "../types";

/**
 * Kelly's landing page: where the money is, what state each grant is in, what
 * the outcomes add up to, and what's due next.
 */
export function OverviewPage() {
  const { data, error, isLoading } = useApiResource<OverviewSummary>(() =>
    api.getOverview(),
  );

  if (isLoading) {
    return <StateMessage title="Loading the overview…" />;
  }
  if (error) {
    return <ApiErrorMessage error={error} />;
  }
  if (!data) {
    return <StateMessage title="No data yet" />;
  }

  const maxStatusCount: number = Math.max(
    1,
    ...data.statusCounts.map((entry) => entry.count),
  );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Overview</h1>
          <p className="page-head__subtitle">
            {data.grantCount} grants tracked · {data.outcomeCount} outcomes recorded
          </p>
        </div>
        <div className="page-head__actions">
          <Link className="button button--primary" to="/grants/new">
            Add grant
          </Link>
          <Link className="button" to="/outcomes/new">
            Record outcome
          </Link>
        </div>
      </div>

      <section className="tile-row">
        <Tile value={formatMoney(data.totalReceived)} label="funding received" />
        <Tile value={formatMoney(data.totalRequested)} label="funding requested" />
        <Tile
          value={formatNumber(data.activeGrantCount)}
          label={`active grants of ${data.grantCount}`}
        />
        <Tile
          value={formatNumber(data.peopleServedTotal)}
          label={`people served across ${data.zipCount} zip codes`}
        />
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Grants by status</h2>
            <Link className="panel__link" to="/grants">
              All grants
            </Link>
          </div>
          <ul className="bar-list">
            {data.statusCounts.map((entry) => (
              <li key={entry.status} className="bar-list__item">
                <div className="bar-list__header">
                  <Link to={`/grants?status=${entry.status}`} className="bar-list__label">
                    {GRANT_STATUS_LABELS[entry.status]}
                  </Link>
                  <span className="bar-list__value">
                    {entry.count}
                    <span className="muted muted--inline">
                      {formatMoney(entry.amountReceived)} received
                    </span>
                  </span>
                </div>
                <div className="bar">
                  <div
                    className={`bar__fill bar__fill--${entry.status}`}
                    style={{ width: `${(entry.count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Reporting deadlines</h2>
          </div>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="muted">Nothing due on the active grants.</p>
          ) : (
            <ul className="deadline-list">
              {data.upcomingDeadlines.map((deadline) => (
                <DeadlineRow key={deadline.grantId} deadline={deadline} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Outcomes by zip</h2>
            <Link className="panel__link" to="/outcomes">
              All outcomes
            </Link>
          </div>
          {data.topZips.length === 0 ? (
            <p className="muted">No outcomes recorded yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Zip</th>
                  <th scope="col">People served</th>
                  <th scope="col">Outcomes</th>
                  <th scope="col">Grants</th>
                </tr>
              </thead>
              <tbody>
                {data.topZips.map((row) => (
                  <tr key={row.zipCode}>
                    <td className="table__primary">{row.zipCode}</td>
                    <td>{formatNumber(row.peopleServed)}</td>
                    <td>{row.outcomeCount}</td>
                    <td>{row.grantCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recently added</h2>
          </div>
          <ul className="record-list">
            {data.recentGrants.map((grant) => (
              <li key={grant.grantId} className="record-list__item">
                <Link to={`/grants/${grant.grantId}`} className="record-list__title">
                  {grant.name}
                </Link>
                <span className="record-list__meta">
                  {grant.funder} · {formatMoney(grant.amountRequested)} requested
                </span>
                <StatusBadge status={grant.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile">
      <p className="tile__value">{value}</p>
      <p className="tile__label">{label}</p>
    </div>
  );
}

function DeadlineRow({ deadline }: { deadline: UpcomingDeadline }) {
  const isOverdue: boolean = deadline.daysUntilDue < 0;
  const isSoon: boolean = deadline.daysUntilDue >= 0 && deadline.daysUntilDue <= 30;

  const when: string = isOverdue
    ? `${Math.abs(deadline.daysUntilDue)} days overdue`
    : deadline.daysUntilDue === 0
      ? "due today"
      : `in ${deadline.daysUntilDue} days`;

  return (
    <li className="deadline-list__item">
      <span
        className={
          isOverdue
            ? "deadline-list__date deadline-list__date--overdue"
            : "deadline-list__date"
        }
      >
        {formatDate(deadline.dueDate)}
      </span>
      <span className="deadline-list__body">
        <Link to={`/grants/${deadline.grantId}`}>{deadline.name}</Link>
        <span className="muted">{deadline.funder}</span>
      </span>
      <span className={isOverdue || isSoon ? "pill pill--warn" : "pill"}>{when}</span>
    </li>
  );
}
