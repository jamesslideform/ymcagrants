import { Link } from "react-router-dom";

import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { formatNumber } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { ListResponse, Outcome, OutcomesByZip } from "../types";

/** The by-zip rollup from the whiteboard, with the raw records underneath. */
export function OutcomesPage() {
  const byZip = useApiResource<ListResponse<OutcomesByZip>>(
    () => api.getOutcomesByZip(),
    [],
  );
  const outcomes = useApiResource<ListResponse<Outcome>>(() => api.listOutcomes(), []);

  const totalPeopleServed: number = (byZip.data?.items ?? []).reduce(
    (sum, row) => sum + (row.peopleServed ?? 0),
    0,
  );

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
        <h2 className="panel__title">By zip code</h2>

        {byZip.isLoading ? <StateMessage title="Loading rollup…" /> : null}
        {byZip.error ? <ApiErrorMessage error={byZip.error} /> : null}

        {byZip.data && byZip.data.items.length === 0 ? (
          <p className="muted">No outcomes recorded yet.</p>
        ) : null}

        {byZip.data && byZip.data.items.length > 0 ? (
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
              {byZip.data.items.map((row) => (
                <tr key={row.zipCode}>
                  <td className="table__primary">{row.zipCode}</td>
                  <td>{formatNumber(row.peopleServed)}</td>
                  <td>{row.outcomeCount}</td>
                  <td>{row.grantCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="panel__title">All records</h2>

        {outcomes.isLoading ? <StateMessage title="Loading outcomes…" /> : null}
        {outcomes.error ? <ApiErrorMessage error={outcomes.error} /> : null}

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
                  <span className="pill">{outcome.zipCode}</span>
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
