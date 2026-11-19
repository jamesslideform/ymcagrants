import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../api/client";
import { Field, SelectField, TextAreaField } from "../components/Field";
import { ApiErrorMessage, StateMessage } from "../components/StateMessage";
import { useApiResource } from "../hooks/useApiResource";
import type { Grant, ListResponse, OutcomeInput } from "../types";

interface OutcomeFormState {
  grantId: string;
  zipCode: string;
  peopleServed: string;
  socialStatus: string;
  descriptionOfFunding: string;
  result: string;
}

function optionalText(value: string): string | null {
  const trimmed: string = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toOutcomeInput(form: OutcomeFormState): OutcomeInput {
  const peopleServed: number = Number(form.peopleServed.trim());

  return {
    grantId: form.grantId,
    zipCode: form.zipCode.trim(),
    peopleServed:
      form.peopleServed.trim() === "" || !Number.isFinite(peopleServed)
        ? null
        : peopleServed,
    socialStatus: optionalText(form.socialStatus),
    descriptionOfFunding: optionalText(form.descriptionOfFunding),
    result: optionalText(form.result),
  };
}

/**
 * Record an outcome. Reached either standalone or from a grant, in which case
 * the grant is already chosen.
 */
export function NewOutcomePage() {
  const { grantId } = useParams<{ grantId: string }>();
  const navigate = useNavigate();

  const grants = useApiResource<ListResponse<Grant>>(() => api.listGrants(), []);

  const [form, setForm] = useState<OutcomeFormState>({
    grantId: grantId ?? "",
    zipCode: "",
    peopleServed: "",
    socialStatus: "",
    descriptionOfFunding: "",
    result: "",
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  const isGrantFixed: boolean = grantId !== undefined;
  const grantOptions = (grants.data?.items ?? []).map((grant) => ({
    value: grant.grantId,
    label: `${grant.name} · ${grant.funder}`,
  }));

  function handleChange(name: string, value: string): void {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      await api.createOutcome(toOutcomeInput(form));
      navigate(form.grantId === "" ? "/outcomes" : `/grants/${form.grantId}`);
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
        {isGrantFixed ? (
          <>
            <Link to={`/grants/${grantId}`}>Grant</Link>
            <span aria-hidden="true"> / </span>
          </>
        ) : (
          <>
            <Link to="/outcomes">Outcomes</Link>
            <span aria-hidden="true"> / </span>
          </>
        )}
        <span>Record outcome</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="page-head__title">Record an outcome</h1>
          <p className="page-head__subtitle">
            Counts and categories only — never a client&apos;s name or case detail.
          </p>
        </div>
      </div>

      <section className="panel">
        {grants.error ? <ApiErrorMessage error={grants.error} /> : null}
        {grants.isLoading ? <StateMessage title="Loading grants…" /> : null}

        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <SelectField
              label="Grant"
              name="grantId"
              value={form.grantId}
              options={grantOptions}
              onChange={handleChange}
              required
              placeholder="Select a grant…"
              hint={isGrantFixed ? "Pre-filled from the grant you came from" : undefined}
            />
            <Field
              label="Locale"
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              required
              placeholder="37902"
              hint="Zip code — what the by-zip rollup groups on"
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
              placeholder="After-school programming at the downtown branch"
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
            <Link className="button" to={isGrantFixed ? `/grants/${grantId}` : "/outcomes"}>
              Cancel
            </Link>
          </div>
        </form>

        {saveError ? <ApiErrorMessage error={saveError} /> : null}
      </section>
    </div>
  );
}
