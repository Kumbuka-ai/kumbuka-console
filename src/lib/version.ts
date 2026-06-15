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
} | null;

/**
 * Console's own build version. Read directly from package.json — Next.js
 * inlines the JSON import at build time, no Dockerfile ARG plumbing needed,
 * package.json stays the single source of truth.
 */
export const CONSOLE_VERSION: string = (pkg as { version?: string }).version ?? "unknown";

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
