import { NavLink, Route, Routes } from "react-router-dom";

import { GrantDetailPage } from "./pages/GrantDetailPage";
import { GrantsPage } from "./pages/GrantsPage";
import { NewGrantPage } from "./pages/NewGrantPage";
import { NewOutcomePage } from "./pages/NewOutcomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OutcomesPage } from "./pages/OutcomesPage";
import { OverviewPage } from "./pages/OverviewPage";

const NAV_ITEMS: ReadonlyArray<{ to: string; label: string }> = [
  { to: "/", label: "Overview" },
  { to: "/grants", label: "Grants" },
  { to: "/outcomes", label: "Outcomes" },
];

/**
 * App shell and routing.
 *
 * No login: the prototype runs as the grants manager. When auth lands, this is
 * where the route guard goes — see FRONTEND_TODO.md.
 */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <img
            className="app__logo"
            src="/brand/ymca-mark-white.svg"
            alt="YMCA"
            width={105}
            height={80}
          />
          <span className="app__brand-text">
            <span className="app__title">Grants &amp; Outcomes</span>
            <span className="app__subtitle">YMCA of East Tennessee</span>
          </span>
        </div>
        <nav className="app__nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link--active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app__main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/grants" element={<GrantsPage />} />
          <Route path="/grants/new" element={<NewGrantPage />} />
          <Route path="/grants/:grantId" element={<GrantDetailPage />} />
          <Route path="/grants/:grantId/outcomes/new" element={<NewOutcomePage />} />
          <Route path="/outcomes" element={<OutcomesPage />} />
          <Route path="/outcomes/new" element={<NewOutcomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="app__footer">
        <img
          className="app__footer-lockup"
          src="/brand/ymca-lockup-impact-purple.png"
          alt="YMCA — for youth development, for healthy living, for social responsibility"
          width={1218}
          height={394}
        />
        <p className="app__footer-text">
          <span className="app__tagline">For a better us.®</span>
          Grants &amp; Outcomes prototype · YMCA of East Tennessee
        </p>
      </footer>
    </div>
  );
}
