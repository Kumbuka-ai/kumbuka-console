import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { AccountForm } from "./AccountForm";
import type { ActiveSession, SessionView } from "@/lib/api/types";

// Render under a fixed `en` provider so these assertions stay in English.
function renderAccount(props: { session: SessionView; sessions: ActiveSession[] | null }) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AccountForm {...props} />
    </NextIntlClientProvider>,
  );
}

// Server actions + toast are the two cross-cutting deps; stub them so the
// test sees only AccountForm's own job — rendering the caller's connections
// and wiring the per-row terminate to terminateSessionAction(id).
const { updateMeMock, terminateMock, pushMock } = vi.hoisted(() => ({
  updateMeMock: vi.fn(),
  terminateMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/app/(app)/actions", () => ({
  updateMeAction: (...a: unknown[]) => updateMeMock(...a),
  terminateSessionAction: (...a: unknown[]) => terminateMock(...a),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: pushMock }) }));

const SESSION: SessionView = {
  subject: "kc-me",
  email: "me@kumbuka.ai",
  displayName: "Me",
  role: "member",
  accountConsoleUrl: "https://auth.example/realms/kumbuka/account",
  securityActionUrl:
    "https://auth.example/realms/kumbuka/protocol/openid-connect/auth?client_id=kumbuka-admin" +
    "&response_type=code&scope=openid&code_challenge_method=S256&code_challenge=abc",
  muted: false,
};

const SESSIONS: ActiveSession[] = [
  {
    id: "sess-console",
    ipAddress: "192.0.2.10",
    startedAt: "2026-06-13T09:00:00Z",
    lastAccessAt: "2026-06-13T10:59:00Z",
    rememberMe: false,
    clients: ["kumbuka-admin"],
    current: true,
  },
  {
    id: "sess-connector",
    ipAddress: "198.51.100.4",
    startedAt: "2026-06-10T09:00:00Z",
    lastAccessAt: "2026-06-12T22:00:00Z",
    rememberMe: true,
    clients: ["kumbuka-connector-acme"],
    current: false,
  },
];

describe("AccountForm — active connections (D-CORE-8)", () => {
  beforeEach(() => {
    updateMeMock.mockReset();
    terminateMock.mockReset();
    pushMock.mockReset();
    // Reset the URL between tests — the kc_action_status effect reads it on
    // mount and one test seeds a query that would otherwise leak forward.
    window.history.replaceState(null, "", "/account");
  });

  it("lists the caller's connections, labelling client + marking the current one", () => {
    renderAccount({ session: SESSION, sessions: SESSIONS });
    expect(screen.getByText(/Web console/)).toBeTruthy();
    expect(screen.getByText(/Assistant connector/)).toBeTruthy();
    // The connector alias is surfaced as part of the label.
    expect(screen.getByText(/acme/)).toBeTruthy();
    // The current session is flagged and offers no terminate button.
    expect(screen.getByText("this device")).toBeTruthy();
  });

  it("terminating a non-current session delegates by id", async () => {
    terminateMock.mockResolvedValue(undefined);
    renderAccount({ session: SESSION, sessions: SESSIONS });

    // Exactly one End button — for the non-current connector session.
    const endBtn = screen.getByRole("button", { name: /End/ });
    fireEvent.click(endBtn);

    await waitFor(() => expect(terminateMock).toHaveBeenCalledWith("sess-connector"));
  });

  it("falls back to the identity-provider link when sessions can't be loaded", () => {
    renderAccount({ session: SESSION, sessions: null });
    expect(screen.getByText(/Manage them in the identity provider/)).toBeTruthy();
  });

  it("shows an empty state when there are no other connections", () => {
    renderAccount({ session: SESSION, sessions: [] });
    expect(screen.getByText(/No other active connections/)).toBeTruthy();
  });

  it("deep-links the password method into the matching AIA (kc_action + redirect_uri)", () => {
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    renderAccount({ session: SESSION, sessions: [] });

    fireEvent.click(screen.getByText("Password"));

    expect(assign).toHaveBeenCalledTimes(1);
    const url = assign.mock.calls[0][0] as string;
    expect(url).toContain("kc_action=UPDATE_PASSWORD");
    expect(url).toContain("/protocol/openid-connect/auth");
    // The console supplies its OWN origin as redirect_uri (not the MCP host).
    expect(url).toContain(`redirect_uri=${encodeURIComponent(`${window.location.origin}/account`)}`);
    assign.mockRestore();
  });

  it("2FA and passkey carry their own kc_action", () => {
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    renderAccount({ session: SESSION, sessions: [] });

    fireEvent.click(screen.getByText("Two-factor authentication"));
    expect((assign.mock.calls[0][0] as string)).toContain("kc_action=CONFIGURE_TOTP");

    fireEvent.click(screen.getByText("Passkey"));
    expect((assign.mock.calls[1][0] as string)).toContain("kc_action=webauthn-register-passwordless");
    assign.mockRestore();
  });

  it("surfaces kc_action_status on return as a toast and strips the query", () => {
    window.history.replaceState(null, "", "/account?kc_action_status=success&code=x");
    renderAccount({ session: SESSION, sessions: [] });

    expect(pushMock).toHaveBeenCalledWith({ message: "Security settings updated." });
    // The AIA params are stripped so a refresh doesn't re-fire the toast.
    expect(window.location.search).toBe("");
  });

  it("a cancelled action toasts the cancelled message", () => {
    window.history.replaceState(null, "", "/account?kc_action_status=cancelled");
    renderAccount({ session: SESSION, sessions: [] });
    expect(pushMock).toHaveBeenCalledWith({ message: "Action cancelled." });
  });
});
