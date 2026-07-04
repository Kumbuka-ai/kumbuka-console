import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { AccountForm } from "./AccountForm";
import type { ActiveSession, CredentialsView, CredentialView, SessionView } from "@/lib/api/types";

// Render under a fixed `en` provider so these assertions stay in English.
function renderAccount(props: {
  session: SessionView;
  sessions: ActiveSession[] | null;
  credentials?: CredentialsView | null;
}) {
  const {
    credentials = { credentials: CREDENTIALS, recoveryCodesConfigured: false },
    ...rest
  } = props;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AccountForm {...rest} credentials={credentials} />
    </NextIntlClientProvider>,
  );
}

// Server actions + toast are the cross-cutting deps; stub them so the test sees
// only AccountForm's own job — rendering the caller's connections + credentials
// and wiring the actions.
const { updateMeMock, terminateMock, logoutOthersMock, deleteCredMock, pushMock } = vi.hoisted(() => ({
  updateMeMock: vi.fn(),
  terminateMock: vi.fn(),
  logoutOthersMock: vi.fn(),
  deleteCredMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/app/(app)/actions", () => ({
  updateMeAction: (...a: unknown[]) => updateMeMock(...a),
  terminateSessionAction: (...a: unknown[]) => terminateMock(...a),
  logoutOtherSessionsAction: (...a: unknown[]) => logoutOthersMock(...a),
  deleteCredentialAction: (...a: unknown[]) => deleteCredMock(...a),
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

const CREDENTIALS: CredentialView[] = [
  { id: "c-otp", type: "otp", userLabel: "Google Authenticator", createdDate: "2026-05-01T00:00:00Z" },
  { id: "c-pk", type: "webauthn-passwordless", userLabel: "MacBook Touch ID", createdDate: "2026-06-01T00:00:00Z" },
];

describe("AccountForm — active connections (D-CORE-8)", () => {
  beforeEach(() => {
    updateMeMock.mockReset();
    terminateMock.mockReset();
    logoutOthersMock.mockReset();
    deleteCredMock.mockReset();
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

  // "Sign out all other sessions" (F-0082) only shows when there's more than one
  // connection, and delegates to the logout-others action on confirm.
  it("offers 'sign out all other sessions' and delegates on confirm", async () => {
    logoutOthersMock.mockResolvedValue(undefined);
    renderAccount({ session: SESSION, sessions: SESSIONS });
    fireEvent.click(screen.getByRole("button", { name: /Sign out all other sessions/ }));
    // Confirm inside the dialog.
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByText("Sign out all other sessions"));
    await waitFor(() => expect(logoutOthersMock).toHaveBeenCalledTimes(1));
  });

  it("hides 'sign out all other sessions' with a single connection", () => {
    renderAccount({ session: SESSION, sessions: [SESSIONS[0]] });
    expect(screen.queryByRole("button", { name: /Sign out all other sessions/ })).toBeNull();
  });

  // The password method renders the AIA deep-link as its href once the origin is
  // known (after mount); a click then navigates same-tab into the Keycloak flow.
  const hrefOf = (label: string) =>
    screen.getByText(label).closest("a")?.getAttribute("href") ?? "";

  it("deep-links the password method into the matching AIA (kc_action + redirect_uri)", () => {
    renderAccount({ session: SESSION, sessions: [] });

    const href = hrefOf("Password");
    expect(href).toContain("/protocol/openid-connect/auth");
    expect(href).toContain("kc_action=UPDATE_PASSWORD");
    // The console supplies its OWN origin as redirect_uri (not the MCP host).
    expect(href).toContain(`redirect_uri=${encodeURIComponent(`${window.location.origin}/account`)}`);
  });

  it("the card add-buttons carry their own kc_action", () => {
    renderAccount({ session: SESSION, sessions: [] });
    expect(hrefOf("Add authenticator app")).toContain("kc_action=CONFIGURE_TOTP");
    expect(hrefOf("Add passkey")).toContain("kc_action=webauthn-register-passwordless");
  });

  it("falls back to the account-console signing-in page when no AIA base is supplied", () => {
    renderAccount({ session: { ...SESSION, securityActionUrl: undefined }, sessions: [] });
    const href = hrefOf("Password");
    expect(href).toContain("#/security/signingin");
    expect(href).not.toContain("kc_action");
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

describe("AccountForm — credentials (FEAT-32)", () => {
  beforeEach(() => {
    deleteCredMock.mockReset();
    pushMock.mockReset();
    window.history.replaceState(null, "", "/account");
  });

  it("lists authenticator apps and passkeys by their labels", () => {
    renderAccount({ session: SESSION, sessions: [] });
    expect(screen.getByText("Google Authenticator")).toBeTruthy();
    expect(screen.getByText("MacBook Touch ID")).toBeTruthy();
  });

  it("shows the empty state for a credential type with no entries", () => {
    renderAccount({
      session: SESSION,
      sessions: [],
      credentials: { credentials: [], recoveryCodesConfigured: false },
    });
    // Both the otp and passkey cards render the empty copy.
    expect(screen.getAllByText(/None enrolled yet/).length).toBeGreaterThanOrEqual(2);
  });

  it("removing a credential confirms then delegates by id", async () => {
    deleteCredMock.mockResolvedValue(undefined);
    renderAccount({ session: SESSION, sessions: [] });

    // The first Remove trash button is the otp credential (c-otp).
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByText("Remove"));

    await waitFor(() => expect(deleteCredMock).toHaveBeenCalledWith("c-otp"));
  });

  it("falls back to the identity-provider link when credentials can't be loaded", () => {
    renderAccount({ session: SESSION, sessions: [], credentials: null });
    // The security card shows the load-error link-out (distinct from connections).
    expect(screen.getByText(/Couldn't load your credentials/)).toBeTruthy();
  });

  // FEAT-32: the recovery-codes card reflects presence-only state — GENERATE when
  // no codes exist, RE-GENERATE once the caller holds a recovery-authn-codes cred.
  it("renders the recovery card in the generate state when no codes are configured", () => {
    renderAccount({
      session: SESSION,
      sessions: [],
      credentials: { credentials: [], recoveryCodesConfigured: false },
    });
    expect(screen.getByText("Generate codes")).toBeTruthy();
    expect(screen.getByText("No recovery codes yet.")).toBeTruthy();
    expect(screen.queryByText("Regenerate codes")).toBeNull();
  });

  it("renders the recovery card in the re-generate state when codes are configured", () => {
    renderAccount({
      session: SESSION,
      sessions: [],
      credentials: { credentials: [], recoveryCodesConfigured: true },
    });
    expect(screen.getByText("Regenerate codes")).toBeTruthy();
    expect(screen.getByText("Recovery codes are configured.")).toBeTruthy();
    expect(screen.queryByText("Generate codes")).toBeNull();
  });
});
