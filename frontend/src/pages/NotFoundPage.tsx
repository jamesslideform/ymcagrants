import { Link } from "react-router-dom";

import { StateMessage } from "../components/StateMessage";

export function NotFoundPage() {
  return (
    <div className="stack stack--narrow">
      <StateMessage title="Page not found">
        <p>
          That address doesn&apos;t match a screen. <Link to="/">Back to the overview</Link>.
        </p>
      </StateMessage>
    </div>
  );
}
