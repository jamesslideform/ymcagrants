import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatMoney, formatNumber } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { GrantWithOutcomes } from "../types";

/** One grant: its terms, its deadline, and every outcome recorded against it. */
export function GrantDetailPage() {
  const { grantId } = useParams<{ grantId: string }>();

  const { data, error, isLoading } = useApiResource<GrantWithOutcomes>(
    () => api.getGrant(grantId ?? ""),
    [grantId],
  );

  if (isLoading) {
    return <StateMessage title="Loading grant…" />;
  }
  if (error) {
    return error.isNotFound ? (
      <StateMessage title="No such grant" tone="warning">
        <p>
          Nothing is stored under <code>{grantId}</code>.{" "}
          <Link to="/grants">Back to all grants</Link>.
        </p>
      </StateMessage>
    ) : (
      <ApiErrorMessage error={error} />
    );
  }
  if (!data) {
    return <StateMessage title="No grant data" />;
  }

  const peopleServed: number = data.outcomes.reduce(
    (sum, outcome) => sum + (outcome.peopleServed ?? 0),
    0,
  );

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/grants">Grants</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.name}</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">{data.name}</h1>
          <p className="page-head__subtitle">
            {data.funder} · <StatusBadge status={data.status} />
          </p>
        </div>
        <div className="page-head__actions">
          <Link
            className="button button--primary"
            to={`/grants/${data.grantId}/outcomes/new`}
          >
            Record outcome
          </Link>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel__title">Grant terms</h2>
        <dl className="detail-grid">
          <Detail label="Amount requested" value={formatMoney(data.amountRequested)} />
          <Detail label="Amount received" value={formatMoney(data.amountReceived)} />
          <Detail label="Submitted" value={formatDate(data.submissionDate)} />
          <Detail label="Start date" value={formatDate(data.startDate)} />
          <Detail
            label="Length"
            value={data.lengthMonths === null ? "—" : `${data.lengthMonths} months`}
          />
          <Detail label="Report due" value={formatDate(data.dueDate)} />
        </dl>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            Outcomes
            <span className="muted muted--inline">
              {data.outcomes.length} recorded · {formatNumber(peopleServed)} people served
            </span>
          </h2>
        </div>

        {data.outcomes.length === 0 ? (
          <StateMessage title="No outcomes recorded yet">
            <p>
              <Link to={`/grants/${data.grantId}/outcomes/new`}>Record the first one</Link>{" "}
              once this grant has something to report.
            </p>
          </StateMessage>
        ) : (
          <ul className="record-list">
            {data.outcomes.map((outcome) => (
              <li key={outcome.outcomeId} className="record-list__item record-list__item--block">
                <div className="record-list__row">
                  <span className="record-list__title">
                    {formatNumber(outcome.peopleServed)} people served
                  </span>
                  <span className="pill">{outcome.zipCode}</span>
                  {outcome.socialStatus ? (
                    <span className="pill pill--quiet">{outcome.socialStatus}</span>
                  ) : null}
                </div>
                {outcome.descriptionOfFunding ? (
                  <p className="record-list__body">{outcome.descriptionOfFunding}</p>
                ) : null}
                {outcome.result ? (
                  <p className="record-list__body record-list__body--result">
                    {outcome.result}
                  </p>
                ) : (
                  <p className="muted">No result recorded yet.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-grid__item">
      <dt className="detail-grid__label">{label}</dt>
      <dd className="detail-grid__value">{value}</dd>
    </div>
  );
}
