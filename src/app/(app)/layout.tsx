import type { ReactNode } from "react";
import { Rail } from "@/components/shell/Rail";
import { Footer } from "@/components/shell/Footer";
import { listScopes, listDirectory } from "@/lib/api";
import { requireSession } from "@/lib/api/session";
import { fetchBackendVersion } from "@/lib/version";

/**
 * Authenticated layout. Pulls the session (redirects to /signin on 401)
 * and seeds the rail with scope + user counts. Each child page renders
 * its own Topbar so it can attach route-local controls (layout toggle,
 * result counts, …).
 *
 * The session gate runs BEFORE the data fetches — not in Promise.all —
 * for a correctness reason. requireSession() turns a 401 into a
 * NEXT_REDIRECT throw (caught by the router → /signin), while
 * listScopes/listDirectory throw a raw ApiAuthError on 401. Running them in
 * parallel meant whichever 401 rejection won the race decided the
 * outcome: a NEXT_REDIRECT win → clean redirect; an ApiAuthError win →
 * server-side 500 page (prod digest 486888060). The winner is
 * non-deterministic per request — hence the intermittent 500s on the
 * unauthenticated entry path.
 *
 * Sequencing the session check first costs one extra round-trip for
 * authenticated visitors (cheap: /api/auth/me is fast) and is the only
 * reliable way to resolve the redirect first. A race cannot be pinned
 * to a specific loser.
 */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  // backendVersion runs alongside the data fetches — it's @PermitAll on
  // the server and silently null-on-error, so it never blocks the layout.
  // listDirectory (member-safe: subject+displayName only), NOT listUsers —
  // the layout wraps every member-visible page; the admin-only roster would
  // 403 the whole member console (P0 read-authz).
  const [scopes, directory, backendVersion] = await Promise.all([
    listScopes(),
    listDirectory(),
    fetchBackendVersion(),
  ]);

  return (
    <div className="app">
      <Rail session={session} scopes={scopes} memberCount={directory.length} />
      <main className="main">
        {children}
        <Footer backend={backendVersion} />
      </main>
    </div>
  );
}
