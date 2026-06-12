import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

/** Minimal stand-in for NextResponse.next() that records what middleware built. */
const nextCalls: Array<{ init?: { request?: { headers: Headers } }; res: { headers: Headers } }> = [];

vi.mock("next/server", () => ({
  NextResponse: {
    next: (init?: { request?: { headers: Headers } }) => {
      const res = { headers: new Headers() };
      nextCalls.push({ init, res });
      return res;
    },
  },
}));

import { middleware } from "./middleware";

function reqWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

// Build a Response whose getSetCookie() yields the given cookies.
function probeResponse(setCookies: string[]): Response {
  const h = new Headers();
  for (const sc of setCookies) h.append("set-cookie", sc);
  return { headers: h } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  nextCalls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("middleware (session-cookie relay)", () => {
  it("passes through when there is no session cookie", async () => {
    await middleware(reqWith({ cookie: "theme=dark" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nextCalls).toHaveLength(1);
    expect(nextCalls[0].init).toBeUndefined();
  });

  it("skips RSC / prefetch requests", async () => {
    await middleware(reqWith({ cookie: "q_session_admin=A", rsc: "1" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nextCalls[0].init).toBeUndefined();
  });

  it("relays a refreshed Set-Cookie to the browser and the forwarded request", async () => {
    fetchMock.mockResolvedValue(probeResponse(["q_session_admin=NEW; Path=/; HttpOnly"]));
    await middleware(reqWith({ cookie: "q_session_admin=OLD" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const { init, res } = nextCalls[0];
    // forwarded request carries the refreshed cookie for SSR
    expect(init?.request?.headers.get("cookie")).toContain("q_session_admin=NEW");
    // and the browser receives the Set-Cookie
    expect(res.headers.getSetCookie()).toContain("q_session_admin=NEW; Path=/; HttpOnly");
  });

  it("passes through when the backend returns no Set-Cookie", async () => {
    fetchMock.mockResolvedValue(probeResponse([]));
    await middleware(reqWith({ cookie: "q_session_admin=A" }));
    expect(nextCalls[0].init).toBeUndefined();
    expect(nextCalls[0].res.headers.getSetCookie()).toHaveLength(0);
  });

  it("passes through when the probe throws", async () => {
    fetchMock.mockRejectedValue(new Error("backend down"));
    await middleware(reqWith({ cookie: "q_session_admin=A" }));
    expect(nextCalls[0].init).toBeUndefined();
  });
});
