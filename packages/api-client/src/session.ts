/**
 * Generic session helpers — the consumer provides its own
 * `fetchSession()` (since the session DTO is app-specific). On 401
 * (`ApiAuthError`), the helpers redirect to the configured signin
 * route with a `return_to` query string built from the incoming
 * request's invoke path.
 */
import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ApiAuthError } from "./client";

/**
 * Server-Component gate. Calls the consumer-supplied session fetch;
 * if it 401s, redirects to `signinPath?return_to=…` with the original
 * path.
 */
export async function requireSession<S>(
  fetchSession: () => Promise<S>,
  signinPath: string = "/signin",
): Promise<S> {
  try {
    return await fetchSession();
  } catch (err) {
    if (err instanceof ApiAuthError) {
      const h = await headers();
      const path = h.get("x-invoke-path") ?? h.get("x-url") ?? "/";
      redirect(`${signinPath}?return_to=${encodeURIComponent(path)}`);
    }
    throw err;
  }
}

/**
 * Soft variant — returns null on 401 instead of redirecting. Useful
 * for header components that should render a "Sign in" link rather
 * than navigate.
 */
export async function getOptionalSession<S>(
  fetchSession: () => Promise<S>,
): Promise<S | null> {
  try {
    return await fetchSession();
  } catch (err) {
    if (err instanceof ApiAuthError) return null;
    throw err;
  }
}
