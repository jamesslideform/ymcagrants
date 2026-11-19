import { useState } from "react";

import { GrantFormView } from "./views/GrantFormView";
import { OutcomesView } from "./views/OutcomesView";

type ViewName = "grant-form" | "outcomes";

const NAV_ITEMS: ReadonlyArray<{ name: ViewName; label: string }> = [
  { name: "grant-form", label: "Grant form" },
  { name: "outcomes", label: "Outcomes by zip" },
];

/**
 * App shell — the two pages from the kickoff whiteboard.
 *
 * Views switch on local state rather than a router: there are two screens, and
 * the team should pick a router when deep-linking to a grant matters.
 */
export function App() {
  const [view, setView] = useState<ViewName>("grant-form");

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__title">Grants &amp; Outcomes</span>
          <span className="app__subtitle">YMCA of East Tennessee</span>
        </div>
        <nav className="app__nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.name}
              type="button"
              className={item.name === view ? "nav-link nav-link--active" : "nav-link"}
              aria-current={item.name === view ? "page" : undefined}
              onClick={() => setView(item.name)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__main">
        {view === "grant-form" ? <GrantFormView /> : <OutcomesView />}
      </main>
    </div>
  );
}
