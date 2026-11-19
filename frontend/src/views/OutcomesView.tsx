import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { ApiError, api } from "../api/client";
import { Field, TextAreaField } from "../components/Field";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { formatNumber } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { Grant, ListResponse, OutcomeInput, OutcomesByZip } from "../types";

interface OutcomeFormState {
  grantId: string;
  zipCode: string;
  peopleServed: string;
  socialStatus: string;
  descriptionOfFunding: string;
  result: string;
}

const EMPTY_FORM: OutcomeFormState = {
  grantId: "",
  zipCode: "",
  peopleServed: "",
  socialStatus: "",
  descriptionOfFunding: "",
  result: "",
};

function optionalText(value: string): string | null {
  const trimmed: string = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toOutcomeInput(form: OutcomeFormState): OutcomeInput {
  const peopleServed: number = Number(form.peopleServed.trim());

  return {
    grantId: form.grantId,
    zipCode: form.zipCode.trim(),
    peopleServed: form.peopleServed.trim() === "" || !Number.isFinite(peopleServed)
      ? null
      : peopleServed,
    socialStatus: optionalText(form.socialStatus),
    descriptionOfFunding: optionalText(form.descriptionOfFunding),
    result: optionalText(form.result),
  };
}

/**
 * Outcomes by zip: the totals view from the whiteboard, plus the form that
 * feeds it.
 */
export function OutcomesView() {
  const [form, setForm] = useState<OutcomeFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [didSave, setDidSave] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const byZip = useApiResource<ListResponse<OutcomesByZip>>(
    () => api.getOutcomesByZip(),
    [reloadToken],
  );
  const grants = useApiResource<ListResponse<Grant>>(() => api.listGrants(), []);

  function handleChange(name: string, value: string): void {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleGrantChange(event: ChangeEvent<HTMLSelectElement>): void {
    setForm((previous) => ({ ...previous, grantId: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setDidSave(false);

    try {
      await api.createOutcome(toOutcomeInput(form));
      setForm(EMPTY_FORM);
      setDidSave(true);
      setReloadToken((token) => token + 1);
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "unknown_error", String(caught)),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const totalPeopleServed: number = (byZip.data?.items ?? []).reduce(
    (sum, row) => sum + (row.peopleServed ?? 0),
    0,
  );

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="panel__title">Outcomes by zip</h2>

        {byZip.isLoading ? <StateMessage title="Loading outcomes…" /> : null}
        {byZip.error ? <ApiErrorMessage error={byZip.error} /> : null}

        {byZip.data && byZip.data.items.length === 0 ? (
          <p className="muted">
            No outcomes recorded yet. Add one below and it lands here.
          </p>
        ) : null}

        {byZip.data && byZip.data.items.length > 0 ? (
          <>
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
            <p className="muted">
              {formatNumber(totalPeopleServed)} people served across{" "}
              {byZip.data.items.length} zip codes.
            </p>
          </>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="panel__title">Record an outcome</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="field">
              <label className="field__label" htmlFor="grantId">
                Grant<span className="field__required"> *</span>
              </label>
              <select
                id="grantId"
                name="grantId"
                className="field__input"
                value={form.grantId}
                required
                onChange={handleGrantChange}
              >
                <option value="">Select a grant…</option>
                {(grants.data?.items ?? []).map((grant) => (
                  <option key={grant.grantId} value={grant.grantId}>
                    {grant.name} · {grant.funder}
                  </option>
                ))}
              </select>
              {grants.error ? (
                <p className="field__hint">
                  Grants couldn&apos;t be loaded, so this list is empty.
                </p>
              ) : null}
            </div>

            <Field
              label="Locale"
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              required
              placeholder="37902"
              hint="Zip code — what the by-zip view groups on"
            />
            <Field
              label="People served"
              name="peopleServed"
              type="number"
              value={form.peopleServed}
              onChange={handleChange}
              placeholder="412"
            />
            <Field
              label="Social status"
              name="socialStatus"
              value={form.socialStatus}
              onChange={handleChange}
              placeholder="youth 6-12"
              hint="A category, never an individual"
            />
          </div>

          <div className="field-grid">
            <TextAreaField
              label="Description of funding"
              name="descriptionOfFunding"
              value={form.descriptionOfFunding}
              onChange={handleChange}
              placeholder="After-school programming at the Knoxville branch"
            />
            <TextAreaField
              label="Result"
              name="result"
              value={form.result}
              onChange={handleChange}
              placeholder="Met the target of 350 by the third quarter"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save outcome"}
            </button>
            <span className="muted">Grant and locale are required.</span>
          </div>
        </form>

        {didSave ? <div className="notice notice--success">Outcome saved.</div> : null}
        {saveError ? <ApiErrorMessage error={saveError} /> : null}
      </section>
    </div>
  );
}
