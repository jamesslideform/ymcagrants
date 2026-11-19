import { useState } from "react";

import { DashboardView } from "./views/DashboardView";
import { GrantsView } from "./views/GrantsView";

type ViewName = "dashboard" | "grants";

const NAV_ITEMS: ReadonlyArray<{ name: ViewName; label: string }> = [
  { name: "dashboard", label: "Dashboard" },
  { name: "grants", label: "Grants" },
];

/**
 * App shell.
 *
 * Views are switched with local state rather than a router: there are two
 * screens today, and the team should pick a router when there's a reason to
 * (deep links to a grant are the likely trigger, in phase 1).
 */
export function App() {
  const [view, setView] = useState<ViewName>("dashboard");

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
        {view === "dashboard" ? <DashboardView /> : <GrantsView />}
      </main>
    </div>
  );
}
