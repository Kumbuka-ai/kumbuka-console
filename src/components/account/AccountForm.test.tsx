import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountForm } from "./AccountForm";
import type { ActiveSession, SessionView } from "@/lib/api/types";

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
  });

  it("lists the caller's connections, labelling client + marking the current one", () => {
    render(<AccountForm session={SESSION} sessions={SESSIONS} />);
    expect(screen.getByText(/Web console/)).toBeTruthy();
    expect(screen.getByText(/Assistant connector/)).toBeTruthy();
    // The connector alias is surfaced as part of the label.
    expect(screen.getByText(/acme/)).toBeTruthy();
    // The current session is flagged and offers no terminate button.
    expect(screen.getByText("this device")).toBeTruthy();
  });

  it("terminating a non-current session delegates by id", async () => {
    terminateMock.mockResolvedValue(undefined);
    render(<AccountForm session={SESSION} sessions={SESSIONS} />);

    // Exactly one End button — for the non-current connector session.
    const endBtn = screen.getByRole("button", { name: /End/ });
    fireEvent.click(endBtn);

    await waitFor(() => expect(terminateMock).toHaveBeenCalledWith("sess-connector"));
  });

  it("falls back to the identity-provider link when sessions can't be loaded", () => {
    render(<AccountForm session={SESSION} sessions={null} />);
    expect(screen.getByText(/Manage them in the identity provider/)).toBeTruthy();
  });

  it("shows an empty state when there are no other connections", () => {
    render(<AccountForm session={SESSION} sessions={[]} />);
    expect(screen.getByText(/No other active connections/)).toBeTruthy();
  });
});
