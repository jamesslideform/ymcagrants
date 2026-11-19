import type { ReactNode } from "react";

import type { ApiError } from "../api/client";

interface StateMessageProps {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "warning";
}

/** Shared empty / loading / error panel so every screen behaves the same way. */
export function StateMessage({ title, children, tone = "neutral" }: StateMessageProps) {
  return (
    <div className={`state-message state-message--${tone}`}>
      <p className="state-message__title">{title}</p>
      {children ? <div className="state-message__body">{children}</div> : null}
    </div>
  );
}

/**
 * The error state every screen shows while the backend is still being built.
 * An unreachable API is expected during phase 1, so it reads as guidance rather
 * than a crash.
 */
export function ApiErrorMessage({ error }: { error: ApiError }) {
  if (error.isUnreachable) {
    return (
      <StateMessage title="No backend yet" tone="warning">
        <p>
          The API isn&apos;t answering on <code>localhost:3000</code>. That&apos;s expected
          until the backend lands — see <code>backend/README.md</code>.
        </p>
      </StateMessage>
    );
  }

  return (
    <StateMessage title="Something went wrong" tone="warning">
      <p>{error.message}</p>
      <p className="state-message__detail">
        {error.code} · HTTP {error.status}
      </p>
    </StateMessage>
  );
}
