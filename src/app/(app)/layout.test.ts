/**
 * Regression guard for the (app) layout's auth-gate sequencing.
 *
 * The intermittent prod 500 (digest 486888060) was caused by Promise.all
 * racing requireSession (NEXT_REDIRECT) against listScopes/listUsers
 * (raw ApiAuthError). When a raw ApiAuthError won, the layout threw an
 * uncaught error and the error boundary rendered the 500 page.
 *
 * These tests pin the contract that the bug fix relies on: the session
 * gate resolves BEFORE the parallel data fetches start. If anyone ever
 * collapses this back into a single Promise.all, the first test fails.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { requireSessionMock, listScopesMock, listUsersMock, headersMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listScopesMock: vi.fn(),
  listUsersMock: vi.fn(),
  headersMock: vi.fn(() => ({ get: () => "/overview" })),
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));
vi.mock("@/lib/api/session", () => ({
  requireSession: () => requireSessionMock(),
}));
vi.mock("@/lib/api", () => ({
  listScopes: () => listScopesMock(),
  listUsers: () => listUsersMock(),
}));
vi.mock("@/components/shell/Rail", () => ({
  // The layout returns JSX containing <Rail …>. A null component lets
  // the layout function return without dragging in the real Rail's
  // dependency graph.
  Rail: () => null,
}));

describe("(app) layout — auth gate sequencing", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    listScopesMock.mockReset();
    listUsersMock.mockReset();
  });

  it("does NOT call listScopes / listUsers when requireSession rejects (no race → no 500)", async () => {
    const NEXT_REDIRECT = new Error("__NEXT_REDIRECT__");
    // next/navigation.redirect throws synchronously inside requireSession;
    // we mirror that here as a rejection.
    requireSessionMock.mockRejectedValueOnce(NEXT_REDIRECT);

    const { default: AppLayout } = await import("./layout");

    await expect(AppLayout({ children: null })).rejects.toBe(NEXT_REDIRECT);

    // The point of the fix: data fetches must not start until the session
    // is in hand. If this ever fails, someone collapsed the gate back into
    // a Promise.all and the 500-on-401 race is back.
    expect(listScopesMock).not.toHaveBeenCalled();
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("calls listScopes + listUsers after the session resolves (authenticated path unchanged)", async () => {
    requireSessionMock.mockResolvedValueOnce({ subject: "u", email: "u@x", role: "member" });
    listScopesMock.mockResolvedValueOnce([]);
    listUsersMock.mockResolvedValueOnce([]);

    const { default: AppLayout } = await import("./layout");
    await AppLayout({ children: null });

    expect(requireSessionMock).toHaveBeenCalledTimes(1);
    expect(listScopesMock).toHaveBeenCalledTimes(1);
    expect(listUsersMock).toHaveBeenCalledTimes(1);
  });

  it("fans out listScopes + listUsers in parallel — not serially — once the session is known", async () => {
    // Both list fetches should be in-flight at the same time. We let
    // requireSession resolve immediately, then assert that both list
    // mocks have been entered before either one resolves.
    requireSessionMock.mockResolvedValueOnce({ subject: "u", email: "u@x", role: "member" });

    let scopesCalled = false;
    let usersCalled = false;
    let scopesResolve!: (v: never[]) => void;
    let usersResolve!: (v: never[]) => void;
    listScopesMock.mockImplementationOnce(() => {
      scopesCalled = true;
      return new Promise((r) => { scopesResolve = r; });
    });
    listUsersMock.mockImplementationOnce(() => {
      usersCalled = true;
      return new Promise((r) => { usersResolve = r; });
    });

    const { default: AppLayout } = await import("./layout");
    const layoutPromise = AppLayout({ children: null });

    // Let the layout's micro-tasks land. Both list calls should be entered
    // before either has been awaited successfully — that's parallel fan-out.
    await Promise.resolve();
    await Promise.resolve();
    expect(scopesCalled).toBe(true);
    expect(usersCalled).toBe(true);

    scopesResolve([]);
    usersResolve([]);
    await layoutPromise;
  });
});
