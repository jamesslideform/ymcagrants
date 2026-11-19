import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import "./styles.css";

/**
 * The stub API is on unless VITE_API_MODE says otherwise. Set
 * VITE_API_MODE=live in .env.local to talk to Mike's backend instead — that
 * one flag is the whole migration on this side.
 */
if (import.meta.env.VITE_API_MODE !== "live") {
  const { installMockApi } = await import("./mocks/mockServer");
  installMockApi();
}

const container: HTMLElement | null = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
