import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { ScopeScreen } from "./ScopeScreen";
import type { EntryView, ScopeView } from "@/lib/api/types";

// The list-collapse toggle persists via the server action; the component
// under test only needs its resolved { ok } shape.
const { setUiSettingsActionMock } = vi.hoisted(() => ({ setUiSettingsActionMock: vi.fn() }));
vi.mock("@/app/(app)/actions", () => ({
  setUiSettingsAction: setUiSettingsActionMock,
}));

// Isolate ScopeScreen's own job — wiring the mobile toggle to the pane's
// `mobileOpen`/backdrop and the wide-viewport collapse — from the children,
// which pull in next/navigation. The stubs surface just the contract
// ScopeScreen drives: ScopesPane.mobileOpen, onClose, collapsed and
// onToggleCollapse.
vi.mock("./ScopesPane", () => ({
  ScopesPane: ({
    mobileOpen,
    onClose,
    collapsed,
    onToggleCollapse,
    canCreateScopes,
  }: {
    mobileOpen: boolean;
    onClose: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    canCreateScopes?: boolean;
  }) => (
    <aside
      data-testid="scopes-pane"
      data-mobile-open={mobileOpen}
      data-collapsed={collapsed}
      data-can-create={canCreateScopes}
    >
      <button type="button" onClick={onClose}>
        pane-close
      </button>
      {onToggleCollapse ? (
        <button type="button" onClick={onToggleCollapse}>
          pane-toggle
        </button>
      ) : null}
    </aside>
  ),
}));
vi.mock("./EntriesView", () => ({
  EntriesView: () => <div data-testid="entries-view" />,
}));

const SCOPE: ScopeView = {
  slug: "global",
  name: "Organization",
  kind: "global",
  fixed: true,
  archived: false,
  locked: false,
  description: null,
  entryCount: 3,
  createdAt: "2026-01-01T00:00:00Z",
};
const ENTRIES: EntryView[] = [];

function renderScreen(
  props: Partial<{ canCreateScopes: boolean; initialCollapsed: boolean }> = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <ScopeScreen
          scopes={[SCOPE]}
          activeSlug="global"
          scope={SCOPE}
          entries={ENTRIES}
          members={{}}
          {...props}
        />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

const pane = () => screen.getByTestId("scopes-pane");
const screenRoot = () => document.querySelector(".scope-screen") as HTMLElement;

beforeEach(() => {
  setUiSettingsActionMock.mockReset().mockResolvedValue({ ok: true });
});

describe("ScopeScreen — mobile pane toggle", () => {
  it("starts closed: pane not mobile-open, no backdrop", () => {
    renderScreen();
    expect(pane().getAttribute("data-mobile-open")).toBe("false");
    expect(screen.queryByRole("button", { name: "Close scope browser" })).toBeNull();
  });

  it("the 'Scopes' toggle opens the pane and renders the backdrop", () => {
    // This is the regression: on mobile the pane is CSS-hidden and nothing set
    // .mobile-open, so the scope browser was unreachable. The toggle must flip
    // mobileOpen to true.
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Browse scopes" }));

    expect(pane().getAttribute("data-mobile-open")).toBe("true");
    expect(screen.getByRole("button", { name: "Close scope browser" })).toBeTruthy();
  });

  it("clicking the backdrop closes the pane again", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Browse scopes" }));
    fireEvent.click(screen.getByRole("button", { name: "Close scope browser" }));

    expect(pane().getAttribute("data-mobile-open")).toBe("false");
    expect(screen.queryByRole("button", { name: "Close scope browser" })).toBeNull();
  });

  it("the pane's own onClose (the in-pane close button) also closes it", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Browse scopes" }));
    fireEvent.click(screen.getByRole("button", { name: "pane-close" }));

    expect(pane().getAttribute("data-mobile-open")).toBe("false");
  });

  it("forwards canCreateScopes to the pane (gates the '+' affordance)", () => {
    renderScreen({ canCreateScopes: false });
    expect(pane().getAttribute("data-can-create")).toBe("false");
  });

  it("defaults canCreateScopes to true when not provided", () => {
    renderScreen();
    expect(pane().getAttribute("data-can-create")).toBe("true");
  });
});

describe("ScopeScreen — list collapse persistence (wide viewports)", () => {
  it("renders expanded by default", () => {
    renderScreen();
    expect(screenRoot().className).not.toContain("pane-collapsed");
    expect(pane().getAttribute("data-collapsed")).toBe("false");
    expect(setUiSettingsActionMock).not.toHaveBeenCalled();
  });

  it("renders collapsed on FIRST paint when the session carries scopesCollapsed (no flicker)", () => {
    renderScreen({ initialCollapsed: true });
    expect(screenRoot().className).toContain("pane-collapsed");
    expect(pane().getAttribute("data-collapsed")).toBe("true");
    // Rendering the persisted state is not a save.
    expect(setUiSettingsActionMock).not.toHaveBeenCalled();
  });

  it("the pane's bottom strip collapses optimistically and persists ONLY the scopes field", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "pane-toggle" }));
    expect(screenRoot().className).toContain("pane-collapsed");
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ scopesCollapsed: true });
  });

  it("the same strip expands the collapsed list again (false is a write too)", () => {
    renderScreen({ initialCollapsed: true });
    fireEvent.click(screen.getByRole("button", { name: "pane-toggle" }));
    expect(screenRoot().className).not.toContain("pane-collapsed");
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ scopesCollapsed: false });
  });

  it("keeps the clicked state and shows a non-blocking notice when the save fails", async () => {
    setUiSettingsActionMock.mockResolvedValue({ ok: false });
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "pane-toggle" }));
    expect(await screen.findByText(en.common.viewSaveFailed)).toBeTruthy();
    expect(screenRoot().className).toContain("pane-collapsed");
  });
});
