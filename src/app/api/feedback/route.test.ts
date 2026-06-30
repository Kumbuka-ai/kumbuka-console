import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const WEBHOOK = "https://n8n.example.test/webhook/feedback";

function reqWith(body: unknown): Request {
  return new Request("http://console.test/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reqBadJson(): Request {
  return new Request("http://console.test/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not json",
  });
}

describe("feedback BFF route", () => {
  beforeEach(() => {
    delete process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    delete process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL;
  });

  it("503 unconfigured when the webhook env var is unset (fail-loud, no silent drop)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "unconfigured" });
    // Nothing was forwarded.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("503 when the webhook env var is blank/whitespace", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = "   ";
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(503);
  });

  it("forwards to the webhook and returns 200 when set + valid", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    const res = await POST(reqWith({ category: "feature", message: "please add X", contact: "me@x.de" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
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
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    await POST(reqWith({ category: "general", message: "hi", contact: "   " }));
    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sent.contact).toBeNull();
  });

  it("400 invalid on an unknown category", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await POST(reqWith({ category: "spam", message: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "invalid" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("400 invalid on an empty message", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const res = await POST(reqWith({ category: "bug", message: "   " }));
    expect(res.status).toBe(400);
  });

  it("400 invalid on malformed JSON", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    const res = await POST(reqBadJson());
    expect(res.status).toBe(400);
  });

  it("502 upstream when the webhook returns a non-2xx (message NOT delivered)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "upstream" });
  });

  it("502 upstream when the webhook fetch throws (timeout / network)", async () => {
    process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL = WEBHOOK;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const res = await POST(reqWith({ category: "bug", message: "boom" }));
    expect(res.status).toBe(502);
  });
});
