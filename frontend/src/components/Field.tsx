import type { ChangeEvent, ReactNode } from "react";

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: "text" | "date" | "number";
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
}

/** Label + input, so every form on the site lines up the same way. */
export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  hint,
}: FieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(name, event.target.value);
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
        {required ? <span className="field__required"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        className="field__input"
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={handleChange}
      />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextAreaField({
  label,
  name,
  value,
  onChange,
  rows = 3,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <div className="field field--wide">
      <label className="field__label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        className="field__input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </div>
  );
}
