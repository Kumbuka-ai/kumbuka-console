import { describe, it, expect, vi } from "vitest";

// `import "server-only"` is a no-op marker with no vitest-resolvable package;
// stub it so the picker module can be imported under test.
vi.mock("server-only", () => ({}));

import * as api from "./index";

/**
 * The single API entry point picks the live BFF client or the in-process mock
 * and re-exports the surface. Importing it runs the picker; this smoke test also
 * pins the FEAT-32 additions (credentials + session self-management) as part of
 * the exported surface so a rename can't silently drop them.
 */
describe("api index — impl picker surface", () => {
  it("exposes the credentials + session self-management functions", () => {
    const expected = [
      "listCredentials",
      "deleteCredential",
      "listSessions",
      "terminateSession",
      "logoutOtherSessions",
      "getSession",
      "updateMe",
    ] as const;
    for (const name of expected) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe("function");
    }
    expect(api.ApiError).toBeDefined();
    expect(api.ApiAuthError).toBeDefined();
  });

  it("wires the in-process mock (incl. mock session) when the mock env is set", async () => {
    vi.resetModules();
    vi.stubEnv("KUMBUKA_API_MOCK", "1");
    vi.stubEnv("KUMBUKA_API_MOCK_SESSION", "1");
    const mockApi = await import("./index");
    expect(typeof mockApi.listCredentials).toBe("function");
    expect(typeof mockApi.getSession).toBe("function");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
