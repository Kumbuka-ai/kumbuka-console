/**
 * requireSession — used by the (app) layout to gate every authenticated
 * route. On 401 we redirect to /signin with the original path so the
 * sign-in CTA can build a return_to.
 */
import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ApiAuthError, getSession } from "./index";
import type { SessionView } from "./types";

export async function requireSession(): Promise<SessionView> {
  try {
    return await getSession();
  } catch (err) {
    if (err instanceof ApiAuthError) {
      const h = await headers();
      const path = h.get("x-invoke-path") ?? h.get("x-url") ?? "/";
      redirect(`/signin?return_to=${encodeURIComponent(path)}`);
    }
    throw err;
  }
}

export async function getOptionalSession(): Promise<SessionView | null> {
  try {
    return await getSession();
  } catch (err) {
    if (err instanceof ApiAuthError) return null;
    throw err;
  }
}
