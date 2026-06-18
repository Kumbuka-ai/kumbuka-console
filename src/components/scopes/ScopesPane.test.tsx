import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { ScopesPane } from "./ScopesPane";
import type { ScopeView } from "@/lib/api/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(app)/actions", () => ({
  archiveScopeAction: vi.fn(),
  createScopeAction: vi.fn(),
  renameScopeAction: vi.fn(),
}));

const project: ScopeView = {
  slug: "atlas-web",
  name: "Atlas Web",
  kind: "project",
  fixed: false,
  archived: false,
  description: null,
  entryCount: 3,
  createdAt: "2026-06-18T00:00:00Z",
};
const globalScope: ScopeView = { ...project, slug: "global", name: "Global", kind: "global", fixed: true };

function renderPane(isAdmin: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <ScopesPane scopes={[globalScope, project]} activeSlug="atlas-web" isAdmin={isAdmin} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("ScopesPane — scope lifecycle is admin-gated (dogfood-16)", () => {
  it("admin sees Rename + Archive in a project's menu", () => {
    const { container } = renderPane(true);
    fireEvent.click(container.querySelector<HTMLButtonElement>(".row-menu-btn")!);
    expect(screen.getByRole("menuitem", { name: /rename/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /archive/i })).toBeTruthy();
  });

  it("a plain member sees neither Rename nor Archive — only the harmless copy-id", () => {
    const { container } = renderPane(false);
    fireEvent.click(container.querySelector<HTMLButtonElement>(".row-menu-btn")!);
    expect(screen.queryByRole("menuitem", { name: /rename/i })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /archive/i })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /copy/i })).toBeTruthy();
  });
});

describe("ScopesPane — archived scopes stay reachable (dogfood-16)", () => {
  it("renders an archived section so an archived scope is not a dead end", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ToastHost>
          <ScopesPane
            scopes={[globalScope, { ...project, archived: true }]}
            activeSlug="global"
            isAdmin
          />
        </ToastHost>
      </NextIntlClientProvider>,
    );
    // the archived scope's slug is visible (reachable), not hidden entirely
    expect(screen.getByText("atlas-web")).toBeTruthy();
  });
});
