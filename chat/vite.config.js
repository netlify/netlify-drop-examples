import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteTsConfigPaths from "vite-tsconfig-paths";

// `tanstackStart()` already bundles the TanStack Router plugin (route
// generation + code splitting). Registering it a second time breaks `vite dev`
// with "Duplicate declaration" errors.
const basePlugins = [
  tailwindcss(),
  tanstackStart(),
  viteReact(),
  netlify(),
  viteTsConfigPaths({
    projects: ['./tsconfig.json'],
  }),
];

// Add Sentry plugin only if auth token is available
if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: basePlugins,
  build: {
    // Only generate source maps if Sentry is enabled
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
});
