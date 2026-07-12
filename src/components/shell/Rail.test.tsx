/**
 * Pins the default nav-extension contract (see docs/extension-points.md):
 * `getNavExtensions("rail")` is empty by default, and the Rail renders
 * exactly today's items — nothing is appended, no placeholder, no badge.
 * The registry is consumed through the live `@kumbuka-ai/console/slots`
 * specifier (unmocked), so this test would fail if the default registry
 * ever started contributing items.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { getNavExtensions } from "@kumbuka-ai/console/slots";
import { Rail } from "./Rail";
import type { SessionView } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
}));

// Icon renders an SVG sprite; the nav contract under test is the link set.
vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// SetupGuide needs the onboarding context; it is not part of the nav-items
// contract this test pins.
vi.mock("@/components/onboarding/SetupGuide", () => ({
  SetupGuide: () => null,
}));

const SESSION: SessionView = {
  subject: "11111111-2222-3333-4444-555555555555",
  email: "admin@example.test",
  displayName: "Ada Admin",
  role: "admin",
  accountConsoleUrl: "https://kc.example.test/account",
  muted: false,
};

function renderRail() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Rail session={SESSION} scopes={[]} memberCount={3} />
    </NextIntlClientProvider>,
  );
}

describe("nav extensions (default registry)", () => {
  it('getNavExtensions("rail") returns []', () => {
    expect(getNavExtensions("rail")).toEqual([]);
  });

  it("Rail renders exactly today's items — the empty contribution appends nothing", () => {
    renderRail();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/overview", "/scopes", "/team", "/settings", "/account"]);
  });
});
