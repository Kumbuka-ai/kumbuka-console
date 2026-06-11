/**
 * serverFetch — the one and only entry point the frontend uses to reach
 * the kumbuka-backend admin API.
 *
 * Runs on the server (Server Components, Server Actions, route handlers).
 * Forwards the browser's HttpOnly session cookie so the backend can
 * authenticate the request as the human behind the rail.
 *
 * Per ADR-0009 we treat 401 specially: the response is a structured
 * { loginUrl, ... } JSON body. We surface that as ApiAuthError so the
 * caller can redirect to /signin.
 */
import { cookies, headers } from "next/headers";

const BASE = process.env.KUMBUKA_BACKEND_URL ?? "http://kumbuka-backend:8080";

export class ApiAuthError extends Error {
  loginUrl: string;
  constructor(loginUrl: string) {
    super("Unauthenticated");
    this.loginUrl = loginUrl;
    this.name = "ApiAuthError";
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

type FetchInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Mutations bypass the read cache and revalidate; default true for non-GET. */
  cache?: RequestCache;
};

export async function serverFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const method = init.method ?? "GET";

  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // X-Forwarded-* — preserve whatever Caddy gave us so the backend can
  // build absolute return_to URLs in the auth flow.
  const incoming = await headers();
  const fwdHost = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? undefined;
  const fwdProto = incoming.get("x-forwarded-proto") ?? "https";

  const h = new Headers(init.headers);
  if (cookieHeader) h.set("cookie", cookieHeader);
  if (init.body !== undefined && !h.has("content-type")) {
    h.set("content-type", "application/json");
  }
  // Make /api/auth/me return JSON 401 instead of redirecting (ADR-0009).
  h.set("accept", "application/json");
  h.set("x-requested-with", "kumbuka-console");
  if (fwdHost) h.set("x-forwarded-host", fwdHost);
  if (fwdProto) h.set("x-forwarded-proto", fwdProto);

  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: h,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: init.cache ?? "no-store",
    redirect: "manual",
  });

  // Backend should never redirect /api/* for XHR; if it does we treat it as
  // an auth challenge (e.g. session expired and the JSON tweak isn't live).
  if (res.status >= 300 && res.status < 400) {
    const loginUrl = res.headers.get("location") ?? "/api/auth/login";
    throw new ApiAuthError(loginUrl);
  }

  if (res.status === 401) {
    let body: { loginUrl?: string } = {};
    try {
      body = (await res.json()) as { loginUrl?: string };
    } catch {
      /* tolerate empty body */
    }
    throw new ApiAuthError(body.loginUrl ?? "/api/auth/login");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let body: unknown = undefined;
    try {
      body = await res.json();
    } catch {
      /* tolerate non-JSON */
    }
    throw new ApiError(res.status, `${method} ${path} → ${res.status}`, body);
  }

  return (await res.json()) as T;
}
