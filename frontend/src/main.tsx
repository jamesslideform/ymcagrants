import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "./App";
import { announceApiMode, apiMode } from "./api/mode";
import "./styles.css";

/**
 * The stub API is the default and the fallback; live is opt-in via
 * VITE_API_MODE=live in frontend/.env.local. See ./api/mode for exactly what
 * qualifies and why it falls back rather than forward.
 */
if (apiMode === "stub") {
  const { installMockApi } = await import("./mocks/mockServer");
  installMockApi();
}
announceApiMode();

const container: HTMLElement | null = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}

/*
 * HashRouter, not BrowserRouter.
 *
 * Redeep's managed static hosting has no SPA fallback — measured 2026-11-19:
 * publishing with --spa still 404s /grants and /nope rather than serving
 * index.html. With history routing, a test user who refreshes on any page but
 * the root, or opens a shared link to a grant, gets a 404.
 *
 * Hashing the route keeps every request at "/", so refresh and shared links
 * work anywhere this is hosted. The cost is a "#" in the URL
 * (/#/grants/g-1001). Switch back to BrowserRouter if this ever moves to a
 * host that rewrites unknown paths to index.html.
 */
createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
