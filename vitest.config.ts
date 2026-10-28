import path from "path";
import { defineConfig } from "vitest/config";

// Mirrors the aliases reactivated adds to its own Vite build, so tests can import
// client modules the same way the app does. Test files live next to the code under
// client/, but the client build and SSR only pull in what client/index.tsx and
// client/templates/*.tsx import, so they never ship.
export default defineConfig({
  resolve: {
    alias: {
      "@client": path.resolve(import.meta.dirname, "./client"),
      "@reactivated": path.resolve(import.meta.dirname, "./node_modules/_reactivated"),
    },
  },
  test: {
    include: ["client/**/*.test.{ts,tsx}"],
  },
});
