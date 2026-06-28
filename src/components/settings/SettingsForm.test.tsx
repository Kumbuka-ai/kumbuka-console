import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { SettingsForm } from "./SettingsForm";
import type { ConnectorView, ScopeView, SettingsView } from "@/lib/api/types";

// The form imports server actions; in jsdom they must be stubbed (a real
// "use server" call would try to reach the BFF). We assert wiring via the
// connector card, which renders purely from props.
const { rotateSecretMock, updateSettingsMock } = vi.hoisted(() => ({
  rotateSecretMock: vi.fn(),
  updateSettingsMock: vi.fn(),
}));
vi.mock("@/app/(app)/actions", () => ({
  rotateSecretAction: () => rotateSecretMock(),
  updateSettingsAction: (req: unknown) => updateSettingsMock(req),
}));

const SETTINGS: SettingsView = {
  writePolicy: "ask",
  effectiveWritePolicy: "ask",
  defaultScopeSlug: null,
  defaultScopeStatus: "ok",
  createScopes: "admins",
};

function connector(overrides: Partial<ConnectorView> = {}): ConnectorView {
  return {
    endpoint: "https://acme.kumbuka.ai",
    mcpUrl: "https://acme.kumbuka.ai/mcp",
    clientId: "kumbuka-acme",
    clientSecretMasked: null,
    idpName: "Keycloak",
    ...overrides,
  };
}

function renderForm(conn: ConnectorView, projectScopes: ScopeView[] = [], isAdmin = true) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <SettingsForm
          initial={SETTINGS}
          connector={conn}
          projectScopes={projectScopes}
          isAdmin={isAdmin}
        />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

function renderFormWith(initial: SettingsView, projectScopes: ScopeView[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <SettingsForm initial={initial} connector={connector()} projectScopes={projectScopes} isAdmin />
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

describe("SettingsForm — connector card", () => {
  beforeEach(() => {
    rotateSecretMock.mockReset();
    updateSettingsMock.mockReset();
  });

  it("renders the tenant-correct MCP endpoint and client id", () => {
    renderForm(connector());
    expect(screen.getByText("https://acme.kumbuka.ai/mcp")).toBeTruthy();
    expect(screen.getByText("kumbuka-acme")).toBeTruthy();
  });

  it("public PKCE connector (no secret): shows the empty-secret hint, no Rotate button", () => {
    // This is the SaaS default and the regression that shipped a confidential-
    // client secret card to a public-client tenant. clientSecretMasked === null
    // must render the "leave the secret empty" guidance and offer no rotation.
    renderForm(connector({ clientSecretMasked: null }));

    expect(
      screen.getByText(/public client \(PKCE\)\. Leave the secret field empty/i),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /rotate/i })).toBeNull();
    // The card intro must not invite rotating a secret that doesn't exist.
    expect(screen.queryByText(/Rotate the secret if it may have leaked/i)).toBeNull();
  });

  it("confidential connector (masked secret): shows the masked value + Rotate", () => {
    renderForm(connector({ clientSecretMasked: "sk_live_••••2f9a" }));

    expect(screen.getByText("sk_live_••••2f9a")).toBeTruthy();
    expect(screen.getByRole("button", { name: /rotate/i })).toBeTruthy();
    expect(screen.getByText(/Rotate the secret if it may have leaked/i)).toBeTruthy();
  });

  it("Rotate opens a confirm dialog scoped to the client id; cancelling does not call the action", () => {
    renderForm(connector({ clientSecretMasked: "sk_live_••••2f9a" }));

    fireEvent.click(screen.getByRole("button", { name: /rotate/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.getAttribute("aria-label")).toMatch(/Rotate the client secret/i);
    expect(screen.getByText(/client secret · kumbuka-acme/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(rotateSecretMock).not.toHaveBeenCalled();
  });
});

describe("SettingsForm — read-only for members (Defect 3)", () => {
  beforeEach(() => {
    rotateSecretMock.mockReset();
    updateSettingsMock.mockReset();
  });

  it("admin sees the Save/Discard action bar", () => {
    renderForm(connector(), [], true);
    expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /discard/i })).toBeTruthy();
  });

  it("member: no Save/Discard bar — settings are admin-write", () => {
    renderForm(connector(), [], false);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /discard/i })).toBeNull();
  });

  it("member: the policy radios are disabled and inert", () => {
    renderForm(connector(), [], false);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    for (const r of radios) expect(r.getAttribute("aria-disabled")).toBe("true");

    // Clicking a currently-unselected option must not change the selection.
    const unchecked = radios.find((r) => r.getAttribute("aria-checked") === "false");
    expect(unchecked).toBeTruthy();
    fireEvent.click(unchecked!);
    expect(unchecked!.getAttribute("aria-checked")).toBe("false");
  });

  it("member: no Rotate button even when a secret exists", () => {
    renderForm(connector({ clientSecretMasked: "sk_live_••••2f9a" }), [], false);
    expect(screen.getByText("sk_live_••••2f9a")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /rotate/i })).toBeNull();
  });
});
