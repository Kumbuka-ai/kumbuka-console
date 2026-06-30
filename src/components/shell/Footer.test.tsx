/**
 * Pin the Footer renders both versions when the backend probe succeeded,
 * and a placeholder when it returned null (the transient-error path).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { Footer } from "./Footer";
import { CONSOLE_VERSION } from "@/lib/version";
import type { BackendVersion } from "@/lib/version";

// The footer now carries the FEAT-11 feedback entry point (a client component
// that uses next-intl + the toast host), so the footer renders inside both.
function renderFooter(backend: BackendVersion) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <Footer backend={backend} />
      </ToastHost>
    </NextIntlClientProvider>,
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

  it("carries the discreet feedback entry point", () => {
    renderFooter(null);
    expect(screen.getByRole("button", { name: /feedback/i })).not.toBeNull();
  });
});
