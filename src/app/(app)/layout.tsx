import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Rail } from "@/components/shell/Rail";
import { listScopes, listUsers } from "@/lib/api";
import { requireSession } from "@/lib/api/session";

/**
 * Authenticated layout. Pulls the session (redirects to /signin on 401)
 * and seeds the rail with scope + user counts. Each child page renders
 * its own Topbar so it can attach route-local controls (layout toggle,
 * result counts, …).
 *
 * The session gate runs BEFORE the data fetches — not in Promise.all —
 * for a correctness reason. requireSession() turns a 401 into a
 * NEXT_REDIRECT throw (caught by the router → /signin), while
 * listScopes/listUsers throw a raw ApiAuthError on 401. Running them in
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
  const [scopes, users] = await Promise.all([listScopes(), listUsers()]);

  const h = await headers();
  const path = h.get("x-invoke-path") ?? h.get("x-url") ?? "/";
  const ROUTES = [
    { prefix: "/overview", id: "overview" },
    { prefix: "/scopes", id: "scopes" },
    { prefix: "/team", id: "team" },
    { prefix: "/settings", id: "settings" },
    { prefix: "/account", id: "account" },
  ];
  const active = ROUTES.find((r) => path.startsWith(r.prefix))?.id ?? "overview";

  return (
    <div className="app">
      <Rail activeId={active} session={session} scopes={scopes} users={users} />
      <main className="main">{children}</main>
    </div>
  );
}
