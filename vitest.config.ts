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
  // Use React's automatic JSX runtime so component tests don't need to
  // `import React from "react"`.
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // Component tests (anything inside packages/ui/src/** or src/components/**)
    // run under jsdom so React + @testing-library can render. Server-side
    // modules (src/lib/**, src/app/**, packages/api-client) keep the lean
    // node env.
    environmentMatchGlobs: [
      ["packages/ui/src/**/*.test.{ts,tsx}", "jsdom"],
      ["src/components/**/*.test.{ts,tsx}", "jsdom"],
    ],
    // RTL cleanup() must run between component tests; the setup file
    // handles it.
    setupFiles: ["./vitest.setup.ts"],
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
        "src/lib/locale.ts",
        "src/i18n/config.ts",
        "src/lib/api/client.ts",
        "src/lib/api/session.ts",
        "src/lib/api/impl-live.ts",
        "src/lib/api/index.ts",
        "src/lib/api/types.ts",
        "src/lib/mock/impl-mock.ts",
        "src/lib/auth/sessionCookies.ts",
        "src/middleware.ts",
        "src/app/(app)/actions.ts",
        "packages/api-client/src/client.ts",
        "packages/api-client/src/session.ts",
        "packages/ui/src/primitives/Button.tsx",
        "packages/ui/src/primitives/Avatar.tsx",
        "packages/ui/src/primitives/Chip.tsx",
        "packages/ui/src/primitives/Icon.tsx",
        "packages/ui/src/primitives/Menu.tsx",
        "packages/ui/src/primitives/Seg.tsx",
        "packages/ui/src/primitives/State.tsx",
        "packages/ui/src/markers/NoContentMarker.tsx",
        "packages/ui/src/modals/ConfirmModal.tsx",
        "packages/ui/src/modals/SidePanel.tsx",
        "packages/ui/src/shell/Rail.tsx",
        "packages/ui/src/shell/Topbar.tsx",
        "packages/ui/src/shell/ThemeToggle.tsx",
        // Two app components that shipped session regressions and were
        // previously untested: the connector card (confidential-vs-public
        // secret rendering) and the mobile scope-pane toggle.
        "src/components/settings/SettingsForm.tsx",
        "src/components/scopes/ScopeScreen.tsx",
        // FEAT-19 scope content-lock control — unit-tested in ScopeLock.test.tsx.
        "src/components/scopes/ScopeLock.tsx",
        // Version footer: small but the only path that surfaces the
        // running console + backend build to the operator UI.
        "src/lib/version.ts",
        "src/components/shell/Footer.tsx",
        // Onboarding wizard (D-CORE-10.1) — unit-tested in
        // components/onboarding/OnboardingWizard.test.tsx (lifecycle, invite
        // parse/send, scope slug + dup-guard, re-open, scope-guard negative).
        "src/components/onboarding/OnboardingProvider.tsx",
        "src/components/onboarding/OnboardingWizard.tsx",
        "src/components/onboarding/WizardExplain.tsx",
        "src/components/onboarding/WizardInvite.tsx",
        "src/components/onboarding/WizardScopes.tsx",
        "src/components/onboarding/SetupGuide.tsx",
        "src/components/onboarding/steps.ts",
        // FEAT-11 beta feedback channel: the BFF forward route (env-webhook,
        // fail-loud 503/502) + the in-product form and its footer entry point.
        "src/app/api/feedback/route.ts",
        "src/components/feedback/FeedbackDialog.tsx",
        "src/components/feedback/FeedbackLink.tsx",
      ],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
      ],
    },
  },
});
