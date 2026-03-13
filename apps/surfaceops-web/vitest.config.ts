import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
    exclude: [
      "**/tests/onboarding-browser-smoke.test.mjs",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
