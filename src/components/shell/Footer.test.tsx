/**
 * Pin the Footer renders both versions when the backend probe succeeded,
 * and a placeholder when it returned null (the transient-error path).
 *
 * The feedback entry point is env-gated on its own sink — but inside the
 * slot DEFAULT (SupportEntry), not around the slot: unset/blank renders
 * version chips and nothing else; set renders the entry; and a bound
 * `footer.support` override renders regardless of the variable, because
 * the slot itself is unconditional.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { Footer } from "./Footer";
import { CONSOLE_VERSION } from "@/lib/version";
import type { BackendVersion } from "@/lib/version";
import type { ComponentType } from "react";

// The footer carries the feedback entry point (a client component that uses
// next-intl + the toast host), so the footer renders inside both.
function renderFooter(backend: BackendVersion, FooterCmp: ComponentType<{ backend: BackendVersion }> = Footer) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <FooterCmp backend={backend} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@kumbuka-ai/console/slots");
  vi.resetModules();
});

describe("Footer", () => {
  it("renders both versions on a successful backend probe", () => {
    renderFooter({ name: "kumbuka-server", version: "v0.6.13" });
    expect(screen.getByText(CONSOLE_VERSION)).not.toBeNull();
    expect(screen.getByText("v0.6.13")).not.toBeNull();
    expect(screen.getByText("console")).not.toBeNull();
    expect(screen.getByText("backend")).not.toBeNull();
  });

  it("renders the placeholder when the backend probe returned null", () => {
    renderFooter(null);
    expect(screen.getByText(CONSOLE_VERSION)).not.toBeNull();
    // `—` keeps the footer visible (and the layout stable) instead of
    // hiding it when the backend hiccuped.
    expect(screen.getByText("—")).not.toBeNull();
  });

  // The default's contract, both directions: an entry point whose sink is an
  // env var renders only when that var is set — a dead button is worse than
  // a clean absence.
  it("carries the feedback entry point when the webhook sink is configured", () => {
    vi.stubEnv("KUMBUKA_FEEDBACK_WEBHOOK_URL", "https://hooks.example.test/feedback");
    renderFooter(null);
    expect(screen.getByRole("button", { name: /feedback/i })).not.toBeNull();
  });

  it("renders no feedback entry point when the webhook sink is unset", () => {
    vi.stubEnv("KUMBUKA_FEEDBACK_WEBHOOK_URL", "");
    renderFooter(null);
    expect(screen.queryByRole("button", { name: /feedback/i })).toBeNull();
  });

  it("treats a blank webhook sink as unconfigured", () => {
    vi.stubEnv("KUMBUKA_FEEDBACK_WEBHOOK_URL", "   ");
    renderFooter(null);
    expect(screen.queryByRole("button", { name: /feedback/i })).toBeNull();
  });

  // The slot's contract: the env condition lives INSIDE the default, so a
  // build that binds its own footer.support component is never hostage to a
  // configuration variable its component does not read.
  it("renders a bound override even when the webhook sink is unset", async () => {
    vi.stubEnv("KUMBUKA_FEEDBACK_WEBHOOK_URL", "");
    vi.doMock("@kumbuka-ai/console/slots", () => ({
      slots: {
        "footer.support": () => <span data-testid="support-override">custom support</span>,
      },
      getNavExtensions: () => [],
    }));
    vi.resetModules();
    const { Footer: FooterWithOverride } = await import("./Footer");
    renderFooter(null, FooterWithOverride);
    expect(screen.getByTestId("support-override")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /feedback/i })).toBeNull();
  });
});
