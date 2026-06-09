import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const headersMock = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

const redirectMock = vi.fn((_url: string): never => {
  // next/navigation#redirect throws internally; mirror that semantic so the
  // calling function exits at the same point.
  throw new Error("__NEXT_REDIRECT__");
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

import { ApiAuthError } from "./client";
import { getOptionalSession, requireSession } from "./session";

describe("requireSession", () => {
  it("returns the session when fetchSession resolves", async () => {
    const session = { user: "alice" };
    const out = await requireSession(async () => session);
    expect(out).toBe(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects with the incoming x-invoke-path on ApiAuthError", async () => {
    headersMock.mockReturnValue({ get: (k: string) => (k === "x-invoke-path" ? "/scopes/personal" : null) });
    redirectMock.mockClear();

    await expect(
      requireSession(async () => {
        throw new ApiAuthError("/api/auth/login");
      }),
    ).rejects.toThrow("__NEXT_REDIRECT__");

    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2Fscopes%2Fpersonal");
  });

  it("falls back to x-url when x-invoke-path is missing", async () => {
    headersMock.mockReturnValue({
      get: (k: string) => (k === "x-url" ? "/team" : null),
    });
    redirectMock.mockClear();

    await expect(
      requireSession(async () => {
        throw new ApiAuthError("/api/auth/login");
      }),
    ).rejects.toThrow("__NEXT_REDIRECT__");

    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2Fteam");
  });

  it("falls back to '/' when neither header is set", async () => {
    headersMock.mockReturnValue({ get: () => null });
    redirectMock.mockClear();

    await expect(
      requireSession(async () => {
        throw new ApiAuthError("/api/auth/login");
      }),
    ).rejects.toThrow("__NEXT_REDIRECT__");

    expect(redirectMock).toHaveBeenCalledWith("/signin?return_to=%2F");
  });

  it("honours a custom signinPath (per-consumer wiring)", async () => {
    headersMock.mockReturnValue({ get: () => "/dashboard" });
    redirectMock.mockClear();

    await expect(
      requireSession(
        async () => {
          throw new ApiAuthError("/x");
        },
        "/ops/signin",
      ),
    ).rejects.toThrow("__NEXT_REDIRECT__");

    expect(redirectMock).toHaveBeenCalledWith("/ops/signin?return_to=%2Fdashboard");
  });

  it("rethrows non-auth errors without redirecting", async () => {
    redirectMock.mockClear();
    const boom = new Error("backend exploded");
    await expect(requireSession(async () => { throw boom; })).rejects.toBe(boom);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("getOptionalSession", () => {
  it("returns the session when fetchSession resolves", async () => {
    const s = { user: "bob" };
    expect(await getOptionalSession(async () => s)).toBe(s);
  });

  it("returns null on ApiAuthError (so a header can render 'Sign in' instead of navigating)", async () => {
    expect(
      await getOptionalSession(async () => {
        throw new ApiAuthError("/x");
      }),
    ).toBeNull();
  });

  it("rethrows non-auth errors", async () => {
    const boom = new Error("nope");
    await expect(getOptionalSession(async () => { throw boom; })).rejects.toBe(boom);
  });
});
