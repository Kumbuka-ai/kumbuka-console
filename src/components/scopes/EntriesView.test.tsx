import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { EntriesView } from "./EntriesView";
import { SYSTEM_SUBJECT, type EntryView, type ScopeView } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("@/app/(app)/actions", () => ({
  deleteEntryAction: vi.fn(),
  lockScopeAction: vi.fn(),
  unlockScopeAction: vi.fn(),
}));

const lockedScope: ScopeView = {
  slug: "atlas-web",
  name: "Atlas Web",
  kind: "project",
  fixed: false,
  archived: false,
  locked: true,
  description: null,
  entryCount: 1,
  createdAt: "2026-06-18T00:00:00Z",
};

const entry: EntryView = {
  id: "e1",
  type: "decision",
  key: "ship.cadence",
  content: "We ship daily.",
  reference: null,
  authorSubject: "u-1",
  source: "console",
  createdAt: "2026-06-18T00:00:00Z",
  updatedAt: "2026-06-18T00:00:00Z",
};

const systemEntry: EntryView = { ...entry, id: "e-sys", key: "how-to", authorSubject: SYSTEM_SUBJECT };

function renderView(over: Partial<Parameters<typeof EntriesView>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <EntriesView
          scope={lockedScope}
          scopes={[lockedScope]}
          entries={[entry]}
          members={{ "u-1": "Ada" }}
          isAdmin={false}
          {...over}
        />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

const openRowMenu = (container: HTMLElement) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(".row-menu-btn")!);

describe("EntriesView — locked scope, member (FEAT-19 §B2)", () => {
  it("the lock control is a non-interactive status, never a button", () => {
    const { container } = renderView();
    const lock = container.querySelector(".scope-lock")!;
    expect(lock.tagName).toBe("SPAN");
    expect(lock.getAttribute("role")).toBe("status");
  });

  it("renders the read-only lock-band over the list", () => {
    const { container } = renderView();
    const band = container.querySelector(".lock-band");
    expect(band).not.toBeNull();
    expect(band!.textContent).toMatch(/read-only/i);
  });

  it("disables the primary CTA but keeps it in the DOM", () => {
    const { container } = renderView();
    const cta = container.querySelector<HTMLButtonElement>(".etb-cta")!;
    expect(cta).not.toBeNull();
    expect(cta.disabled).toBe(true);
  });

  it("row-menu: Delete is disabled and Edit becomes View", () => {
    const { container } = renderView();
    openRowMenu(container);
    const del = screen.getByRole("menuitem", { name: /delete/i }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    expect(screen.getByRole("menuitem", { name: /^view$/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /^edit$/i })).toBeNull();
  });
});

describe("EntriesView — locked scope, admin (override)", () => {
  it("the lock control is a button with aria-pressed reflecting the locked state", () => {
    const { container } = renderView({ isAdmin: true });
    const lock = container.querySelector(".scope-lock")!;
    expect(lock.tagName).toBe("BUTTON");
    expect(lock.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking the lock opens a plain confirm dialog", () => {
    const { container } = renderView({ isAdmin: true });
    fireEvent.click(container.querySelector<HTMLButtonElement>(".scope-lock")!);
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: /unlock/i })).toBeTruthy();
  });

  it("keeps the CTA enabled (writes are audited overrides)", () => {
    const { container } = renderView({ isAdmin: true });
    expect(container.querySelector<HTMLButtonElement>(".etb-cta")!.disabled).toBe(false);
  });

  it("row-menu: Delete, Edit and Move are all enabled", () => {
    const { container } = renderView({ isAdmin: true, scopes: [lockedScope, { ...lockedScope, slug: "other", locked: false }] });
    openRowMenu(container);
    expect((screen.getByRole("menuitem", { name: /delete/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("menuitem", { name: /^edit$/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("menuitem", { name: /move to scope/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("EntriesView — delete permanence + override (FEAT-19 §B4)", () => {
  it("admin + locked: the delete confirm is the lockWarn override variant", () => {
    const { container } = renderView({ isAdmin: true });
    openRowMenu(container);
    fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: /delete anyway/i })).toBeTruthy();
    expect(dialog.className).toMatch(/warn/);
    expect(dialog.textContent).toMatch(/recorded in the audit log/i);
    expect(dialog.textContent).toMatch(/can't be undone/i);
  });

  it("open scope: the delete confirm is the normal permanent variant (no lockWarn)", () => {
    const openScope = { ...lockedScope, locked: false };
    const { container } = renderView({ isAdmin: true, scope: openScope, scopes: [openScope] });
    openRowMenu(container);
    fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: /^delete$/i })).toBeTruthy();
    expect(dialog.className).not.toMatch(/warn/);
    expect(dialog.textContent).toMatch(/can't be undone/i);
  });
});

describe("EntriesView — axis composition", () => {
  it("a system-seed entry stays delete-disabled even for an admin in a locked scope", () => {
    const { container } = renderView({ isAdmin: true, entries: [systemEntry] });
    openRowMenu(container);
    expect((screen.getByRole("menuitem", { name: /delete/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
