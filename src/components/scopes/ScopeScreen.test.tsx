import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScopeScreen } from "./ScopeScreen";
import type { EntryView, ScopeView } from "@/lib/api/types";

// Isolate ScopeScreen's own job — wiring the mobile toggle to the pane's
// `mobileOpen` and rendering the backdrop — from the children, which pull in
// next/navigation + the toast context. The stubs surface just the contract
// ScopeScreen drives: ScopesPane.mobileOpen and ScopesPane.onClose.
vi.mock("./ScopesPane", () => ({
  ScopesPane: ({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) => (
    <aside data-testid="scopes-pane" data-mobile-open={mobileOpen}>
      <button type="button" onClick={onClose}>
        pane-close
      </button>
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
  description: null,
  entryCount: 3,
  createdAt: "2026-01-01T00:00:00Z",
};
const ENTRIES: EntryView[] = [];

function renderScreen() {
  return render(
    <ScopeScreen
      scopes={[SCOPE]}
      activeSlug="global"
      scope={SCOPE}
      entries={ENTRIES}
      members={{}}
    />,
  );
}

const pane = () => screen.getByTestId("scopes-pane");

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
});
