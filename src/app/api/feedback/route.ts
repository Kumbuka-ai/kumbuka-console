import { CONSOLE_VERSION } from "@/lib/version";
import { serverFetch } from "@/lib/api/client";
import { hasSessionCookie } from "@/lib/auth/sessionCookies";

/**
 * FEAT-11 — in-product beta feedback BFF route.
 *
 * The team-console feedback form (Bug-Report · Feature-Request · General
 * feedback) POSTs here; this route forwards the payload to an env-configured
 * webhook (an n8n flow that mails it — OUT OF SCOPE here, Sprint 59). This
 * mirrors the existing upstream-forward pattern (KUMBUKA_N8N_INTAKE_UPSTREAM /
 * ops-console rejectNotify): the sink is an env var, never a new DB table and
 * never a server change.
 *
 * Session-gated: this route can trigger an outbound webhook (a mail), so it is
 * restricted to authenticated console users. We validate a real BFF session by
 * probing the backend `/api/auth/me` through the shared server-to-server client
 * (`serverFetch`, src/lib/api/client.ts), which forwards the browser's session
 * cookie. Cookie *presence* alone is forgeable, so a present cookie still
 * requires a successful probe.
 *
 * Fail-loud, no silent drop:
 *   - no valid BFF session   -> 401 unauthorized (BEFORE any webhook read/forward)
 *   - webhook env var unset  -> 503 unconfigured (the channel is not wired yet)
 *   - bad/empty payload      -> 400 invalid
 *   - upstream error/non-2xx -> 502 upstream (the message was NOT delivered)
 *   - delivered              -> 200 ok
 */
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["bug", "feature", "general"]);
const MESSAGE_MAX = 5000;
const CONTACT_MAX = 200;
const UPSTREAM_TIMEOUT_MS = 5000;

type FeedbackPayload = {
  category?: unknown;
  message?: unknown;
  contact?: unknown;
};

function bad(reason: string, status: number) {
  return Response.json({ ok: false, reason }, { status });
}

/**
 * Validate a real BFF session. `hasSessionCookie` is a cheap pre-check to skip
 * the backend round-trip on obviously-anonymous requests; a present cookie is
 * forgeable, so it still needs real validation. That is delegated to the vetted
 * server-to-server client (`serverFetch`), which forwards the session cookie and
 * treats a 401/redirect from `/api/auth/me` as `ApiAuthError` (ADR-0009). Any
 * throw — unauthenticated, or the backend unreachable — means "no session".
 */
async function hasValidSession(cookie: string | null): Promise<boolean> {
  if (!hasSessionCookie(cookie)) return false;
  try {
    await serverFetch("/api/auth/me");
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Session gate FIRST — before any webhook read/forward. An unauthenticated
  // request must never reach the outbound channel.
  if (!(await hasValidSession(req.headers.get("cookie")))) {
    return bad("unauthorized", 401);
  }

  // Read at call time (not module load) so the runtime env is honoured and the
  // route is unit-testable. An unset/blank webhook URL is a fail-loud 503 — the
  // beta channel is simply not wired yet, so we never pretend a drop succeeded.
  const webhook = (process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL ?? "").trim();
  if (!webhook) {
    return bad("unconfigured", 503);
  }

  let payload: FeedbackPayload;
  try {
    payload = (await req.json()) as FeedbackPayload;
  } catch {
    return bad("invalid", 400);
  }

  const category = typeof payload.category === "string" ? payload.category : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const contact =
    typeof payload.contact === "string" && payload.contact.trim().length > 0
      ? payload.contact.trim().slice(0, CONTACT_MAX)
      : null;

  if (!CATEGORIES.has(category) || message.length === 0 || message.length > MESSAGE_MAX) {
    return bad("invalid", 400);
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category,
        message,
        contact,
        source: "team-console",
        consoleVersion: CONSOLE_VERSION,
        submittedAt: new Date().toISOString(),
      }),
      // Cap the wait so a stalled n8n never hangs the request.
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      return bad("upstream", 502);
    }
  } catch {
    // Network error / timeout: the message was NOT delivered — say so loudly.
    return bad("upstream", 502);
  }

  return Response.json({ ok: true });
}
