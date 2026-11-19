import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the backend so the browser sees one origin and
// nobody has to think about CORS.
//
// By default that's a backend on localhost:3000. Set API_PROXY_TARGET in
// .env.local to proxy to the deployed API Gateway stage instead, e.g.
// https://abc123.execute-api.us-east-1.amazonaws.com/prod — the stage path is
// kept, so /api/grants becomes /prod/api/grants.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = new URL(env.API_PROXY_TARGET || "http://localhost:3000");
  const basePath = target.pathname.replace(/\/$/, "");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: target.origin,
          changeOrigin: true,
          rewrite: (path) => `${basePath}${path}`,
        },
      },
    },
  };
});
