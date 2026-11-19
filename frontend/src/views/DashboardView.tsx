import { api } from "../api/client";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { useApiResource } from "../hooks/useApiResource";
import type { DashboardSummary, OutcomeSummary } from "../types";
import { formatDate, formatMoney, formatNumber } from "../format";

/**
 * The default leadership view: active funding, deadlines ahead, people served,
 * and progress toward every outcome target. It ships whether or not anyone
 * customizes anything (phase 3 adds saved views on top).
 */
export function DashboardView() {
  const { data, error, isLoading } = useApiResource<DashboardSummary>(() =>
    api.getDashboard(),
  );

  if (isLoading) {
    return <StateMessage title="Loading the dashboard…" />;
  }
  if (error) {
    return <ApiErrorMessage error={error} />;
  }
  if (!data) {
    return <StateMessage title="No dashboard data yet" />;
  }

  return (
    <div className="stack">
      <section className="tile-row">
        <Tile
          value={formatMoney(data.activeFundingTotal)}
          label={`active funding · ${data.activeGrantCount} grants`}
        />
        <Tile
          value={formatNumber(data.deadlinesNext60Days.length)}
          label="deadlines in the next 60 days"
        />
        <Tile
          value={data.peopleServedYearToDate === null
            ? "—"
            : formatNumber(data.peopleServedYearToDate)}
          label="people served, year to date"
        />
      </section>

      <section className="panel">
        <h2 className="panel__title">Next deadlines</h2>
        {data.deadlinesNext60Days.length === 0 ? (
          <p className="muted">Nothing due in the next 60 days.</p>
        ) : (
          <ul className="deadline-list">
            {data.deadlinesNext60Days.map((deliverable) => (
              <li key={deliverable.id} className="deadline-list__item">
                <span className="deadline-list__date">
                  {formatDate(deliverable.dueDate)}
                </span>
                <span>{deliverable.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2 className="panel__title">Progress toward outcomes</h2>
        {data.outcomeProgress.length === 0 ? (
          <p className="muted">No outcome measures recorded yet.</p>
        ) : (
          <ul className="progress-list">
            {data.outcomeProgress.map((outcome) => (
              <ProgressRow key={outcome.grantMeasureId} outcome={outcome} />
            ))}
          </ul>
        )}
      </section>
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

function ProgressRow({ outcome }: { outcome: OutcomeSummary }) {
  const percent: number = outcome.percentOfTarget ?? 0;
  const width: string = `${Math.min(percent, 100)}%`;

  return (
    <li className="progress-list__item">
      <div className="progress-list__header">
        <span>
          {outcome.name}
          {outcome.unit ? <span className="muted"> · {outcome.unit}</span> : null}
        </span>
        <span className="muted">
          {outcome.currentValue ?? "—"}
          {outcome.targetValue ? ` of ${outcome.targetValue}` : ""}
          {outcome.hasGaps ? " · has gaps" : ""}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width }} />
      </div>
    </li>
  );
}
