import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { SettingsForm } from "./SettingsForm";
import type { ScopeView, SettingsView } from "@/lib/api/types";

// The form imports server actions; in jsdom they must be stubbed (a real
// "use server" call would try to reach the BFF).
const { updateSettingsMock } = vi.hoisted(() => ({
  updateSettingsMock: vi.fn(),
}));
vi.mock("@/app/(app)/actions", () => ({
  updateSettingsAction: (req: unknown) => updateSettingsMock(req),
}));

const SETTINGS: SettingsView = {
  writePolicy: "ask",
  effectiveWritePolicy: "ask",
  defaultScopeSlug: null,
  defaultScopeStatus: "ok",
  createScopes: "admins",
};

function renderForm(projectScopes: ScopeView[] = [], isAdmin = true) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <SettingsForm initial={SETTINGS} projectScopes={projectScopes} isAdmin={isAdmin} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

function renderFormWith(initial: SettingsView, projectScopes: ScopeView[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <SettingsForm initial={initial} projectScopes={projectScopes} isAdmin />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("SettingsForm — project policy with null default (console-crash guard)", () => {
  it("renders without crashing and shows a needs-configuration note", () => {
    // The reported crash class: write-policy = project + global fallback + null
    // default. Must render a clear needs-config state, never throw.
    renderFormWith({
      writePolicy: "project",
      effectiveWritePolicy: "project",
      defaultScopeSlug: null,
      defaultScopeStatus: "missing",
      createScopes: "admins",
    });
    expect(screen.getByText(/writes fall back to the global scope/i)).toBeTruthy();
  });

  it("with a default scope set, the needs-config note is absent", () => {
    renderFormWith(
      {
        writePolicy: "project",
        effectiveWritePolicy: "project",
        defaultScopeSlug: "atlas-web",
        defaultScopeStatus: "ok",
        createScopes: "admins",
      },
      [
        {
          slug: "atlas-web",
          name: "Atlas",
          kind: "project",
          fixed: false,
          archived: false,
          locked: false,
          description: null,
          entryCount: 0,
          createdAt: "2026-06-18T00:00:00Z",
        },
      ],
    );
    expect(screen.queryByText(/writes fall back to the global scope/i)).toBeNull();
  });
});

describe("SettingsForm — read-only for members (Defect 3)", () => {
  beforeEach(() => {
    updateSettingsMock.mockReset();
  });

  it("admin sees the Save/Discard action bar", () => {
    renderForm([], true);
    expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /discard/i })).toBeTruthy();
  });

  it("member: no Save/Discard bar — settings are admin-write", () => {
    renderForm([], false);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /discard/i })).toBeNull();
  });

  it("member: the policy radios are disabled and inert", () => {
    renderForm([], false);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    for (const r of radios) expect(r.getAttribute("aria-disabled")).toBe("true");

    // Clicking a currently-unselected option must not change the selection.
    const unchecked = radios.find((r) => r.getAttribute("aria-checked") === "false");
    expect(unchecked).toBeTruthy();
    fireEvent.click(unchecked!);
    expect(unchecked!.getAttribute("aria-checked")).toBe("false");
  });
});
