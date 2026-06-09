import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, headersMock, redirectMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
  redirectMock: vi.fn((_url: string): never => {
    // next/navigation.redirect throws internally; mirror that semantic.
    throw new Error("__NEXT_REDIRECT__");
  }),
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));
// The barrel `./index` re-exports getSession and ApiAuthError. We mock the
// whole barrel so the redirect-on-401 logic can be exercised without dragging
// in the live BFF.
vi.mock("./index", () => {
  class ApiAuthError extends Error {
    constructor(public loginUrl: string) {
      super("Unauthenticated");
      this.name = "ApiAuthError";
    }
  }
  return {
    ApiAuthError,
    getSession: () => getSessionMock(),
  };
});

import { ApiAuthError } from "./index";
import { getOptionalSession, requireSession } from "./session";

describe("requireSession", () => {
  it("returns the session when getSession resolves", async () => {
    const session = { subject: "u", email: "u@x", role: "member" };
    getSessionMock.mockResolvedValueOnce(session);

    const out = await requireSession();
    expect(out).toBe(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /signin with the x-invoke-path return_to on ApiAuthError", async () => {
    redirectMock.mockClear();
    getSessionMock.mockRejectedValueOnce(new ApiAuthError("/api/auth/login"));
    headersMock.mockReturnValueOnce({
      get: (k: string) => (k === "x-invoke-path" ? "/scopes/alpha" : null),
    });

    await expect(requireSession()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2Fscopes%2Falpha");
  });

  it("falls back to x-url when x-invoke-path is missing", async () => {
    redirectMock.mockClear();
    getSessionMock.mockRejectedValueOnce(new ApiAuthError("/x"));
    headersMock.mockReturnValueOnce({
      get: (k: string) => (k === "x-url" ? "/team" : null),
    });

    await expect(requireSession()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2Fteam");
  });

  it("falls back to '/' when neither header is set", async () => {
    redirectMock.mockClear();
    getSessionMock.mockRejectedValueOnce(new ApiAuthError("/x"));
    headersMock.mockReturnValueOnce({ get: () => null });

    await expect(requireSession()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2F");
  });

  it("rethrows non-auth errors without redirecting", async () => {
    redirectMock.mockClear();
    const boom = new Error("backend exploded");
    getSessionMock.mockRejectedValueOnce(boom);

    await expect(requireSession()).rejects.toBe(boom);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("getOptionalSession", () => {
  it("returns the session when getSession resolves", async () => {
    const s = { subject: "u", email: "u@x", role: "member" };
    getSessionMock.mockResolvedValueOnce(s);
    expect(await getOptionalSession()).toBe(s);
  });

  it("returns null on ApiAuthError (so a header can render 'Sign in' instead of navigating)", async () => {
    getSessionMock.mockRejectedValueOnce(new ApiAuthError("/x"));
    expect(await getOptionalSession()).toBeNull();
  });

  it("rethrows non-auth errors", async () => {
    const boom = new Error("nope");
    getSessionMock.mockRejectedValueOnce(boom);
    await expect(getOptionalSession()).rejects.toBe(boom);
  });
});
