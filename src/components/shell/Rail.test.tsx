/**
 * Pins the default nav-extension contract (see docs/extension-points.md):
 * `getNavExtensions("rail")` is empty by default, and the Rail renders
 * exactly today's items — nothing is appended, no placeholder, no badge.
 * The registry is consumed through the live `@kumbuka-ai/console/slots`
 * specifier (unmocked), so this test would fail if the default registry
 * ever started contributing items.
 *
 * Also pins the collapse contract (the tablet requirement): the persisted
 * state arrives with the session and renders on the FIRST paint (no
 * flicker), the toggle is optimistic and persists field-wise, and a failed
 * save keeps the clicked state while surfacing a quiet, non-blocking
 * notice — never a silent failure, never localStorage (see the
 * no-local-storage guard test).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { getNavExtensions } from "@kumbuka-ai/console/slots";
import { ToastHost } from "@/components/ui/Toast";
import { Rail } from "./Rail";
import type { SessionView } from "@/lib/api/types";

// The collapse toggle persists via the server action; the component under
// test only needs its resolved { ok } shape.
const { setUiSettingsActionMock } = vi.hoisted(() => ({ setUiSettingsActionMock: vi.fn() }));
vi.mock("@/app/(app)/actions", () => ({
  setUiSettingsAction: setUiSettingsActionMock,
}));

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

function renderRail(session: SessionView = SESSION) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <Rail session={session} scopes={[]} memberCount={3} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  setUiSettingsActionMock.mockReset().mockResolvedValue({ ok: true });
});

describe("nav extensions (default registry)", () => {
  it('getNavExtensions("rail") returns []', () => {
    expect(getNavExtensions("rail")).toEqual([]);
  });

  it("Rail renders exactly today's items — the empty contribution appends nothing", () => {
    renderRail();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/overview", "/scopes", "/team", "/settings", "/help", "/account"]);
  });
});

describe("collapse persistence (the tablet requirement)", () => {
  it("renders expanded by default (no stored choice)", () => {
    renderRail();
    expect(screen.getByRole("navigation", { name: "Primary" }).className).not.toContain(
      "is-collapsed",
    );
    expect(screen.getByRole("button", { name: en.nav.collapseNav })).toBeTruthy();
  });

  it("renders collapsed on FIRST paint when the session carries navCollapsed (no flicker)", () => {
    renderRail({ ...SESSION, settings: { navCollapsed: true } });
    expect(screen.getByRole("navigation", { name: "Primary" }).className).toContain(
      "is-collapsed",
    );
    expect(screen.getByRole("button", { name: en.nav.expandNav })).toBeTruthy();
    // Rendering the persisted state is not a save.
    expect(setUiSettingsActionMock).not.toHaveBeenCalled();
  });

  it("toggles optimistically and persists ONLY the nav field (server merges)", () => {
    renderRail();
    fireEvent.click(screen.getByRole("button", { name: en.nav.collapseNav }));
    // Optimistic: collapsed before the save resolves.
    expect(screen.getByRole("navigation", { name: "Primary" }).className).toContain(
      "is-collapsed",
    );
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ navCollapsed: true });
    fireEvent.click(screen.getByRole("button", { name: en.nav.expandNav }));
    // Expanding is a write too (false is a value, not an omission).
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ navCollapsed: false });
  });

  it("keeps the clicked state and shows a non-blocking notice when the save fails", async () => {
    setUiSettingsActionMock.mockResolvedValue({ ok: false });
    renderRail();
    fireEvent.click(screen.getByRole("button", { name: en.nav.collapseNav }));
    // Silent failure is forbidden: the quiet notice appears…
    expect(await screen.findByText(en.common.viewSaveFailed)).toBeTruthy();
    // …and the click is respected for this session — still collapsed.
    expect(screen.getByRole("navigation", { name: "Primary" }).className).toContain(
      "is-collapsed",
    );
  });
});
