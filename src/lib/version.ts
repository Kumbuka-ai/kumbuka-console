/**
 * Backend version lookup. Calls the kumbuka-server `/api/version`
 * endpoint, which is `@PermitAll` — no session cookie needed. Surfaced
 * by the layout footer so operators can confirm which backend they're
 * talking to at a glance.
 *
 * Errors are swallowed: the footer prefers showing a `—` to crashing
 * the layout because a transient backend hiccup ate the version probe.
 */
import pkg from "../../package.json";

const BACKEND_BASE = process.env.KUMBUKA_BACKEND_URL ?? "http://kumbuka-backend:8080";

export type BackendVersion = {
  name: string;
  version: string;
  /**
   * Version of the code core inside the backend deployable, when that
   * deployable is a composition around it. Not sent by the backend today;
   * rendered as a `(core …)` suffix as soon as it appears.
   */
  core?: string | null;
} | null;

/**
 * Version of this package's own code — the core. Read directly from
 * package.json — Next.js inlines the JSON import at build time, no
 * Dockerfile ARG plumbing needed, package.json stays the single source
 * of truth. In a composed build this correctly remains the version of
 * the code that came from here.
 */
export const CONSOLE_VERSION: string = (pkg as { version?: string }).version ?? "unknown";

/**
 * Version of the deployable that is actually running, when it is not this
 * package itself. A downstream composition build sets KUMBUKA_BUILD_VERSION
 * to its own release version; the footer then names that build, with
 * CONSOLE_VERSION shown as its core. Read per request — the footer is a
 * server component, so runtime env is available and no build-arg plumbing
 * is needed. Unset or blank → null: a standalone install has no separate
 * deployable.
 */
export function getBuildVersion(): string | null {
  const raw = process.env.KUMBUKA_BUILD_VERSION?.trim();
  return raw ? raw : null;
}

/** Fetch the backend's reported version. Server-side only. */
export async function fetchBackendVersion(): Promise<BackendVersion> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/version`, {
      // Refresh every minute — version doesn't change mid-deploy, but
      // we don't want the layout cached forever either.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendVersion;
  } catch {
    return null;
  }
}
