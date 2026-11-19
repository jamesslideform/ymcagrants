import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { Field, SelectField } from "../components/Field";
import { ApiErrorMessage } from "../components/StateMessage";
import type { Grant, GrantInput, GrantStatus } from "../types";
import { GRANT_STATUSES, GRANT_STATUS_LABELS } from "../types";

interface GrantFormState {
  name: string;
  funder: string;
  status: string;
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
  status: "prospect",
  submissionDate: "",
  startDate: "",
  lengthMonths: "",
  dueDate: "",
  amountRequested: "",
  amountReceived: "",
};

const STATUS_OPTIONS = GRANT_STATUSES.map((status) => ({
  value: status,
  label: GRANT_STATUS_LABELS[status],
}));

/** A blank input means "not known yet", which is a legal partial record. */
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
    status: form.status as GrantStatus,
    submissionDate: optionalText(form.submissionDate),
    startDate: optionalText(form.startDate),
    lengthMonths: optionalNumber(form.lengthMonths),
    dueDate: optionalText(form.dueDate),
    amountRequested: optionalText(form.amountRequested),
    amountReceived: optionalText(form.amountReceived),
  };
}

/** Add a grant, then land on its detail page. */
export function NewGrantPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<GrantFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  function handleChange(name: string, value: string): void {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const created: Grant = await api.createGrant(toGrantInput(form));
      navigate(`/grants/${created.grantId}`);
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "unknown_error", String(caught)),
      );
      setIsSaving(false);
    }
  }

  return (
    <div className="stack stack--narrow">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/grants">Grants</Link>
        <span aria-hidden="true"> / </span>
        <span>New grant</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">New grant</h1>
          <p className="page-head__subtitle">
            Only the name, funder, and status are required — fill in the rest as it
            arrives.
          </p>
        </div>
      </div>

      <section className="panel">
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <Field
              label="Grant name"
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
            <SelectField
              label="Status"
              name="status"
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={handleChange}
              required
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
              label="Report due"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              hint="Drives the deadline list on the overview"
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
              {isSaving ? "Saving…" : "Save grant"}
            </button>
            <Link className="button" to="/grants">
              Cancel
            </Link>
          </div>
        </form>

        {saveError ? <ApiErrorMessage error={saveError} /> : null}
      </section>
    </div>
  );
}
