import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { ScopeLock } from "./ScopeLock";
import type { ScopeView } from "@/lib/api/types";

const { lockMock, unlockMock } = vi.hoisted(() => ({ lockMock: vi.fn(), unlockMock: vi.fn() }));
vi.mock("@/app/(app)/actions", () => ({
  lockScopeAction: (s: string) => lockMock(s),
  unlockScopeAction: (s: string) => unlockMock(s),
}));

const scope = (locked: boolean): ScopeView => ({
  slug: "atlas-web",
  name: "Atlas Web",
  kind: "project",
  fixed: false,
  archived: false,
  locked,
  description: null,
  entryCount: 0,
  createdAt: "2026-06-18T00:00:00Z",
});

function renderLock(locked: boolean, isAdmin: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <ScopeLock scope={scope(locked)} isAdmin={isAdmin} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("ScopeLock — member (non-interactive status)", () => {
  it("open scope: implicit status role (an <output>), never a button, open-state tooltip", () => {
    const { container } = renderLock(false, false);
    const el = container.querySelector(".scope-lock")!;
    expect(el.tagName).toBe("OUTPUT"); // <output> carries an implicit role=status
    expect(screen.getByRole("status")).toBe(el);
    expect(el.getAttribute("title")).toMatch(/scope is open/i);
  });

  it("locked scope: grey status with the read-only tooltip", () => {
    const { container } = renderLock(true, false);
    const el = container.querySelector(".scope-lock")!;
    expect(el.tagName).toBe("OUTPUT");
    expect(el.getAttribute("title")).toMatch(/read-only/i);
  });
});

describe("ScopeLock — admin (toggle button)", () => {
  beforeEach(() => {
    lockMock.mockReset().mockResolvedValue({ ok: true });
    unlockMock.mockReset().mockResolvedValue({ ok: true });
  });

  it("open scope: aria-pressed=false; confirm → lockScopeAction(slug)", async () => {
    const { container } = renderLock(false, true);
    const btn = container.querySelector<HTMLButtonElement>(".scope-lock")!;
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(btn);
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: /read-only/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /lock content/i }));

    await waitFor(() => expect(lockMock).toHaveBeenCalledWith("atlas-web"));
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it("locked scope: aria-pressed=true; confirm → unlockScopeAction(slug)", async () => {
    const { container } = renderLock(true, true);
    const btn = container.querySelector<HTMLButtonElement>(".scope-lock")!;
    expect(btn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(btn);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^unlock$/i }));

    await waitFor(() => expect(unlockMock).toHaveBeenCalledWith("atlas-web"));
    expect(lockMock).not.toHaveBeenCalled();
  });

  it("a failed toggle surfaces an error and keeps the confirm open", async () => {
    lockMock.mockReset().mockResolvedValue({ ok: false });
    const { container } = renderLock(false, true);
    fireEvent.click(container.querySelector<HTMLButtonElement>(".scope-lock")!);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /lock content/i }));

    await waitFor(() => expect(lockMock).toHaveBeenCalledWith("atlas-web"));
    // the !ok branch returns early (no setConfirm(false)) → the dialog stays.
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
