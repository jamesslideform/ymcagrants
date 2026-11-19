import type { GrantStatus } from "../types";
import { GRANT_STATUS_LABELS } from "../types";

/** The one place a grant status turns into a colour. */
export function StatusBadge({ status }: { status: GrantStatus }) {
  return (
    <span className={`badge badge--${status}`}>{GRANT_STATUS_LABELS[status]}</span>
  );
}
