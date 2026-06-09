import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration for the kumbuka-console workspace.
 *
 * Coverage scope is intentionally narrow: only the framework-side
 * lib modules + the shared @kumbuka-ai/api-client. UI components in
 * packages/ui/** and Next.js page/layout files under src/app/** are
 * integration-tested at the UI layer, not unit-tested — widening
 * coverage.include to them would have lcov report 0% for un-tested
 * files and *drop* the SonarQube new_coverage metric (Sonar treats
 * lcov as ground truth; files in the report count entirely).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "packages/*/src/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      // Narrow to exactly the modules we unit-test. Widening this to
      // src/lib/** or packages/**/src/** would have lcov report
      // src/lib/api/** + src/lib/mock/** + packages/ui/** at 0% and
      // drop the SonarQube coverage metric — Sonar takes lcov as
      // ground truth, so files in the report count entirely.
      include: [
        "src/lib/time.ts",
        "src/lib/theme.ts",
        "src/lib/api/client.ts",
        "src/lib/api/session.ts",
        "src/lib/api/impl-live.ts",
        "src/lib/api/types.ts",
        "packages/api-client/src/client.ts",
        "packages/api-client/src/session.ts",
      ],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
      ],
    },
  },
});
