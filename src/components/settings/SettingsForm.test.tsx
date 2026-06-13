import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

function renderForm(conn: ConnectorView, projectScopes: ScopeView[] = []) {
  return render(
    <ToastHost>
      <SettingsForm initial={SETTINGS} connector={conn} projectScopes={projectScopes} />
    </ToastHost>,
  );
}

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
