import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The route's session gate delegates to serverFetch (src/lib/api/client.ts),
// which reads next/headers and is server-only. Mock both so the route is unit
// testable without a Next request context.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [{ name: "q_session", value: "valid" }] }),
  headers: () => ({ get: () => null }),
}));

import { POST } from "./route";

const WEBHOOK = "https://n8n.example.test/webhook/feedback";
const SESSION_COOKIE = "q_session=valid";

function reqWith(body: unknown, cookie: string | null = SESSION_COOKIE): Request {
  return new Request("http://console.test/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function reqBadJson(cookie: string | null = SESSION_COOKIE): Request {
  return new Request("http://console.test/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: "{ not json",
  });
}

/**
 * Route fetch is used for two things: the auth probe (`/api/auth/me`) and the
 * webhook forward. Mock both: the probe answers `authStatus` (default 200 =
 * authenticated), the webhook answers `webhook` (a Response or an Error to
 * throw). Returns the spy so tests can assert what was — and was not — forwarded.
 */
function mockFetch({
  authStatus = 200,
  webhook,
}: {
  authStatus?: number;
  webhook?: Response | Error;
} = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/api/auth/me")) {
      // serverFetch parses the body on a 2xx, so give the probe a JSON body.
      return Promise.resolve(
        new Response(JSON.stringify({ authenticated: true }), {
          status: authStatus,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    if (webhook instanceof Error) return Promise.reject(webhook);
    return Promise.resolve(webhook ?? new Response(null, { status: 200 }));
  });
}

/** Calls made to the webhook URL (i.e. actual forwards), excluding the auth probe. */
function webhookCalls(spy: ReturnType<typeof mockFetch>) {
  return spy.mock.calls.filter((c) => String(c[0]) === WEBHOOK);
}

describe("feedback BFF route", () => {
  beforeEach(() => {
    delete process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    delete process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL;
  });

  // --- session gate (auth) ---------------------------------------------------

  it("401 unauthorized when no session cookie is present (webhook NEVER read/forwarded)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = mockFetch();
    const res = await POST(reqWith({ category: "bug", message: "boom" }, null));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: "unauthorized" });
    // No probe, no forward — an anonymous request short-circuits before any fetch.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("401 when the session probe returns non-2xx (cookie present but invalid)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = mockFetch({ authStatus: 401 });
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: "unauthorized" });
    // Gate failed -> nothing forwarded to the webhook.
    expect(webhookCalls(fetchSpy)).toHaveLength(0);
  });

  it("401 when the session probe throws / times out", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/auth/me")) return Promise.reject(new Error("timeout"));
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(401);
    expect(webhookCalls(fetchSpy)).toHaveLength(0);
  });

  // --- post-gate behaviour (authenticated) -----------------------------------

  it("503 unconfigured when the webhook env var is unset (fail-loud, no silent drop)", async () => {
    const fetchSpy = mockFetch();
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "unconfigured" });
    // Nothing was forwarded.
    expect(webhookCalls(fetchSpy)).toHaveLength(0);
  });

  it("503 when the webhook env var is blank/whitespace", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = "   ";
    mockFetch();
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(503);
  });

  it("forwards to the webhook and returns 200 when set + valid", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = mockFetch({ webhook: new Response(null, { status: 200 }) });

    const res = await POST(reqWith({ category: "feature", message: "please add X", contact: "me@x.de" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const calls = webhookCalls(fetchSpy);
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0];
    expect(url).toBe(WEBHOOK);
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(sent.category).toBe("feature");
    expect(sent.message).toBe("please add X");
    expect(sent.contact).toBe("me@x.de");
    expect(sent.source).toBe("team-console");
  });

  it("normalises a blank contact to null", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = mockFetch({ webhook: new Response(null, { status: 200 }) });
    await POST(reqWith({ category: "general", message: "hi", contact: "   " }));
    const sent = JSON.parse(String(webhookCalls(fetchSpy)[0][1]?.body));
    expect(sent.contact).toBeNull();
  });

  it("400 invalid on an unknown category", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = mockFetch();
    const res = await POST(reqWith({ category: "spam", message: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "invalid" });
    expect(webhookCalls(fetchSpy)).toHaveLength(0);
  });

  it("400 invalid on an empty message", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    mockFetch();
    const res = await POST(reqWith({ category: "bug", message: "   " }));
    expect(res.status).toBe(400);
  });

  it("400 invalid on malformed JSON", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    mockFetch();
    const res = await POST(reqBadJson());
    expect(res.status).toBe(400);
  });

  it("502 upstream when the webhook returns a non-2xx (message NOT delivered)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    mockFetch({ webhook: new Response(null, { status: 500 }) });
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "upstream" });
  });

  it("502 upstream when the webhook fetch throws (timeout / network)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    mockFetch({ webhook: new Error("network") });
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(502);
  });
});
