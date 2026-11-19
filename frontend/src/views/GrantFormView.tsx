import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../api/client";
import { Field } from "../components/Field";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { formatDate, formatMoney } from "../format";
import { useApiResource } from "../hooks/useApiResource";
import type { Grant, GrantInput, ListResponse } from "../types";

/** The form's own state: every input is a string until it's submitted. */
interface GrantFormState {
  name: string;
  funder: string;
  submissionDate: string;
  startDate: string;
  lengthMonths: string;
  dueDate: string;
  amountRequested: string;
  amountReceived: string;
}

const EMPTY_FORM: GrantFormState = {
  name: "",
  funder: "",
  submissionDate: "",
  startDate: "",
  lengthMonths: "",
  dueDate: "",
  amountRequested: "",
  amountReceived: "",
};

/** "" means the grants manager left it blank, which is a legal partial record. */
function optionalText(value: string): string | null {
  const trimmed: string = value.trim();
  return trimmed === "" ? null : trimmed;
}

function optionalNumber(value: string): number | null {
  const trimmed: string = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed: number = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toGrantInput(form: GrantFormState): GrantInput {
  return {
    name: form.name.trim(),
    funder: form.funder.trim(),
    submissionDate: optionalText(form.submissionDate),
    startDate: optionalText(form.startDate),
    lengthMonths: optionalNumber(form.lengthMonths),
    dueDate: optionalText(form.dueDate),
    amountRequested: optionalText(form.amountRequested),
    amountReceived: optionalText(form.amountReceived),
  };
}

/** The grant form page from the whiteboard: fill it in, submit, see it land. */
export function GrantFormView() {
  const [form, setForm] = useState<GrantFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const grants = useApiResource<ListResponse<Grant>>(() => api.listGrants(), [reloadToken]);

  function handleChange(name: string, value: string): void {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedName(null);

    try {
      const created: Grant = await api.createGrant(toGrantInput(form));
      setSavedName(created.name);
      setForm(EMPTY_FORM);
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

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="panel__title">New grant</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <Field
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Youth Development 2026"
            />
            <Field
              label="Funder"
              name="funder"
              value={form.funder}
              onChange={handleChange}
              required
              placeholder="United Way of Greater Knoxville"
            />
            <Field
              label="Submission date"
              name="submissionDate"
              type="date"
              value={form.submissionDate}
              onChange={handleChange}
            />
            <Field
              label="Start date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
            />
            <Field
              label="Length"
              name="lengthMonths"
              type="number"
              value={form.lengthMonths}
              onChange={handleChange}
              placeholder="12"
              hint="Months"
            />
            <Field
              label="Due date"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              hint="When the funder's report is due"
            />
            <Field
              label="Amount requested"
              name="amountRequested"
              value={form.amountRequested}
              onChange={handleChange}
              placeholder="50000.00"
            />
            <Field
              label="Amount received"
              name="amountReceived"
              value={form.amountReceived}
              onChange={handleChange}
              placeholder="48000.00"
              hint="Leave blank until the award lands"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={isSaving}>
              {isSaving ? "Submitting…" : "Submit"}
            </button>
            <span className="muted">Only name and funder are required.</span>
          </div>
        </form>

        {savedName ? (
          <div className="notice notice--success">Saved “{savedName}”.</div>
        ) : null}
        {saveError ? <ApiErrorMessage error={saveError} /> : null}
      </section>

      <section className="panel">
        <h2 className="panel__title">Grants</h2>

        {grants.isLoading ? <StateMessage title="Loading grants…" /> : null}
        {grants.error ? <ApiErrorMessage error={grants.error} /> : null}

        {grants.data && grants.data.items.length === 0 ? (
          <p className="muted">No grants yet. The first one submitted shows up here.</p>
        ) : null}

        {grants.data && grants.data.items.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Grant</th>
                <th scope="col">Funder</th>
                <th scope="col">Requested</th>
                <th scope="col">Received</th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              {grants.data.items.map((grant) => (
                <tr key={grant.grantId}>
                  <td>
                    <span className="table__primary">{grant.name}</span>
                    {grant.lengthMonths === null ? null : (
                      <span className="muted">{grant.lengthMonths} months</span>
                    )}
                  </td>
                  <td>{grant.funder}</td>
                  <td>{formatMoney(grant.amountRequested)}</td>
                  <td>{formatMoney(grant.amountReceived)}</td>
                  <td className="muted">{formatDate(grant.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
