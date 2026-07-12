/**
 * Pin the Footer renders both versions when the backend probe succeeded,
 * and a placeholder when it returned null (the transient-error path).
 *
 * Version provenance: each chip names the deployable actually running.
 * KUMBUKA_BUILD_VERSION set and differing → `console {build} (core {core})`
 * with the full pair in the title; unset, blank or equal → exactly one
 * value, byte for byte today's markup (the outerHTML pin). Same shape for
 * a backend payload that carries a `core`.
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

// The backend chip is the span that starts with its label — position-free,
// so the selector survives the support entry appearing or not.
function findBackendChip(container: HTMLElement): Element | undefined {
  return Array.from(container.querySelectorAll(".app-footer > span")).find((s) =>
    s.textContent?.startsWith("backend"),
  );
}

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

  // Version provenance — the console chip. The unset case pins the exact
  // markup: a standalone install must render exactly what it renders today.
  it("shows exactly one console value when KUMBUKA_BUILD_VERSION is unset", () => {
    const { container } = renderFooter(null);
    const chip = container.querySelector(".app-footer > span");
    expect(chip?.outerHTML).toBe(`<span>console <code>${CONSOLE_VERSION}</code></span>`);
    expect(container.textContent).not.toContain("(core");
  });

  it("names the deployable first, core in parentheses, when KUMBUKA_BUILD_VERSION differs", () => {
    vi.stubEnv("KUMBUKA_BUILD_VERSION", "1.2.3");
    const { container } = renderFooter(null);
    const chip = container.querySelector(".app-footer > span");
    expect(chip?.textContent).toBe(`console 1.2.3 (core ${CONSOLE_VERSION})`);
    // The full pair also travels in the title, so a copy-paste into a bug
    // report carries everything.
    expect(chip?.getAttribute("title")).toBe(`console 1.2.3 (core ${CONSOLE_VERSION})`);
  });

  it("shows one value when KUMBUKA_BUILD_VERSION equals the package version", () => {
    vi.stubEnv("KUMBUKA_BUILD_VERSION", CONSOLE_VERSION);
    const { container } = renderFooter(null);
    const chip = container.querySelector(".app-footer > span");
    expect(chip?.outerHTML).toBe(`<span>console <code>${CONSOLE_VERSION}</code></span>`);
  });

  it("treats a whitespace-only KUMBUKA_BUILD_VERSION as unset", () => {
    vi.stubEnv("KUMBUKA_BUILD_VERSION", "   ");
    const { container } = renderFooter(null);
    const chip = container.querySelector(".app-footer > span");
    expect(chip?.outerHTML).toBe(`<span>console <code>${CONSOLE_VERSION}</code></span>`);
  });

  // Version provenance — the backend chip mirrors the same contract when
  // the payload carries a `core`.
  it("renders the backend core when the payload carries a differing one", () => {
    const { container } = renderFooter({ name: "kumbuka-server", version: "v0.1.4", core: "0.7.5" });
    const chip = findBackendChip(container);
    expect(chip?.textContent).toBe("backend v0.1.4 (core 0.7.5)");
    expect(chip?.getAttribute("title")).toBe("backend v0.1.4 (core 0.7.5)");
  });

  it("keeps the backend chip unchanged when the payload has no core", () => {
    const { container } = renderFooter({ name: "kumbuka-server", version: "v0.6.13" });
    const chip = findBackendChip(container);
    expect(chip?.outerHTML).toBe("<span>backend <code>v0.6.13</code></span>");
  });

  it("shows one backend value when core equals the version", () => {
    const { container } = renderFooter({ name: "kumbuka-server", version: "v0.6.13", core: "v0.6.13" });
    const chip = findBackendChip(container);
    expect(chip?.outerHTML).toBe("<span>backend <code>v0.6.13</code></span>");
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
