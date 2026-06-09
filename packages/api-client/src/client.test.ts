import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookiesMock = vi.fn();
const headersMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
  headers: () => headersMock(),
}));

import { ApiAuthError, ApiError, serverFetch } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function emptyResponse(status: number): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: vi.fn().mockResolvedValue(undefined),
  } as unknown as Response;
}

describe("serverFetch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    cookiesMock.mockReturnValue({
      getAll: () => [
        { name: "session", value: "abc" },
        { name: "csrf", value: "xyz" },
      ],
    });
    headersMock.mockReturnValue({
      get: (k: string) => (k === "x-forwarded-host" ? "console.kumbuka.ai" : "https"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookiesMock.mockReset();
    headersMock.mockReset();
  });

  it("forwards the browser's cookies as a single cookie header (preserves the BFF auth contract)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await serverFetch("/api/me");

    const [, init] = fetchMock.mock.calls[0];
    const cookieHeader = (init.headers as Headers).get("cookie");
    expect(cookieHeader).toBe("session=abc; csrf=xyz");
  });

  it("sets the expected X-Forwarded-* + Accept + X-Requested-With headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await serverFetch("/x");

    const h = (fetchMock.mock.calls[0][1].headers as Headers);
    expect(h.get("accept")).toBe("application/json");
    expect(h.get("x-requested-with")).toBe("kumbuka-console");
    expect(h.get("x-forwarded-host")).toBe("console.kumbuka.ai");
    expect(h.get("x-forwarded-proto")).toBe("https");
  });

  it("falls back to the 'host' header when x-forwarded-host is absent", async () => {
    headersMock.mockReturnValue({
      get: (k: string) => (k === "host" ? "localhost:3000" : null),
    });
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await serverFetch("/x");

    const h = (fetchMock.mock.calls[0][1].headers as Headers);
    expect(h.get("x-forwarded-host")).toBe("localhost:3000");
    expect(h.get("x-forwarded-proto")).toBe("https"); // default when not set
  });

  it("serialises a body and sets content-type to application/json for non-GET", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await serverFetch("/x", { method: "POST", body: { foo: 1 } });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"foo":1}');
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
  });

  it("turns a 3xx redirect into ApiAuthError using the Location header (the JSON 401 path may not yet be live)", async () => {
    const res = {
      status: 302,
      ok: false,
      headers: { get: (k: string) => (k === "location" ? "https://auth/login" : null) },
      json: vi.fn(),
    } as unknown as Response;
    fetchMock.mockResolvedValue(res);

    const err = await serverFetch("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiAuthError);
    expect((err as ApiAuthError).loginUrl).toBe("https://auth/login");
  });

  it("turns 401 with a structured body into ApiAuthError carrying loginUrl", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { loginUrl: "/api/auth/login?return_to=/" }));

    const err = await serverFetch("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiAuthError);
    expect((err as ApiAuthError).loginUrl).toBe("/api/auth/login?return_to=/");
  });

  it("tolerates an empty 401 body (defaults to /api/auth/login)", async () => {
    const res = {
      status: 401,
      ok: false,
      headers: { get: () => null },
      json: vi.fn().mockRejectedValue(new SyntaxError("empty")),
    } as unknown as Response;
    fetchMock.mockResolvedValue(res);

    const err = await serverFetch("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiAuthError);
    expect((err as ApiAuthError).loginUrl).toBe("/api/auth/login");
  });

  it("returns undefined on 204 without touching json()", async () => {
    const res = emptyResponse(204);
    fetchMock.mockResolvedValue(res);

    const out = await serverFetch("/x", { method: "DELETE" });
    expect(out).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("throws ApiError carrying status + body on non-OK with a JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { code: "E_DB" }));

    const err = await serverFetch("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect((err as ApiError).body).toEqual({ code: "E_DB" });
  });

  it("throws ApiError with undefined body when the error response is not JSON-parseable", async () => {
    const res = {
      status: 502,
      ok: false,
      headers: { get: () => null },
      json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
    } as unknown as Response;
    fetchMock.mockResolvedValue(res);

    const err = await serverFetch("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(502);
    expect((err as ApiError).body).toBeUndefined();
  });

  it("uses the cache override when the caller supplies one", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await serverFetch("/x", { cache: "force-cache" });

    expect(fetchMock.mock.calls[0][1].cache).toBe("force-cache");
  });
});
