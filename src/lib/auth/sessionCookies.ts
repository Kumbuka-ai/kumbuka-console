/**
 * Helpers for the BFF session-cookie relay (see src/middleware.ts).
 *
 * Quarkus stores the OIDC session (incl. the rotating refresh token) inside the
 * `q_session*` cookies. When the backend silently refreshes an expired access
 * token it returns fresh `Set-Cookie` headers. Because the console talks to the
 * backend server-to-server, those headers never reach the browser on their own —
 * so the rotated cookie is lost and, with refresh-token rotation enabled in the
 * realm, the next request fails. The middleware re-attaches them; these helpers
 * do the parsing/merging.
 */

export type ParsedSetCookie = { name: string; value: string; deleted: boolean };

/** Parse a single `Set-Cookie` header into its name/value + whether it deletes. */
export function parseSetCookie(setCookie: string): ParsedSetCookie | null {
  const semi = setCookie.indexOf(";");
  const pair = (semi === -1 ? setCookie : setCookie.slice(0, semi)).trim();
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const attrs = setCookie.slice(semi === -1 ? setCookie.length : semi).toLowerCase();
  const deleted = value === "" || /(?:^|;)\s*max-age=0\b/.test(attrs);
  return { name, value, deleted };
}

/**
 * Fold the backend's `Set-Cookie` values into the browser's existing `Cookie`
 * header, so the forwarded SSR request uses the freshly-refreshed session
 * instead of the stale one. Deletions remove the cookie from the jar.
 */
export function mergeCookies(cookieHeader: string, setCookies: readonly string[]): string {
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const t = part.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    jar.set(t.slice(0, eq).trim(), t.slice(eq + 1));
  }
  for (const sc of setCookies) {
    const parsed = parseSetCookie(sc);
    if (!parsed) continue;
    if (parsed.deleted) jar.delete(parsed.name);
    else jar.set(parsed.name, parsed.value);
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/** True when a request carries a Quarkus session cookie worth refreshing. */
export function hasSessionCookie(cookieHeader: string | null): cookieHeader is string {
  return !!cookieHeader && cookieHeader.includes("q_session");
}
