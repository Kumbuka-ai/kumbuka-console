/**
 * Cover the network branches of fetchBackendVersion — the success path
 * and the silent-null-on-error path the layout relies on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

function setFetch(impl: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>) {
  // Cast through `unknown` so TS lets us replace the global with a mock
  // without writing `as unknown as typeof fetch` inline (esbuild's
  // transformer trips over the double-cast at certain positions).
  globalThis.fetch = impl as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchBackendVersion", () => {
  beforeEach(() => {
    // Reset module registry so the BACKEND_BASE constant + import-side
    // effects are re-evaluated cleanly per test.
    vi.resetModules();
  });

  it("returns the parsed body on 2xx", async () => {
    setFetch(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: "kumbuka-server", version: "v0.6.13" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { fetchBackendVersion } = await import("./version");
    const out = await fetchBackendVersion();
    expect(out).toEqual({ name: "kumbuka-server", version: "v0.6.13" });
  });

  it("returns null on non-2xx — layout falls back to a dash, never crashes", async () => {
    setFetch(vi.fn().mockResolvedValue(new Response("err", { status: 503 })));
    const { fetchBackendVersion } = await import("./version");
    expect(await fetchBackendVersion()).toBeNull();
  });

  it("returns null on transport error — silent swallow, no throw", async () => {
    setFetch(vi.fn().mockRejectedValue(new Error("connection refused")));
    const { fetchBackendVersion } = await import("./version");
    expect(await fetchBackendVersion()).toBeNull();
  });
});
