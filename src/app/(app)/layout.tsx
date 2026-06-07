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
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, scopes, users] = await Promise.all([
    requireSession(),
    listScopes(),
    listUsers(),
  ]);

  const h = await headers();
  const path = h.get("x-invoke-path") ?? h.get("x-url") ?? "/";
  const active = path.startsWith("/overview")
    ? "overview"
    : path.startsWith("/scopes")
      ? "scopes"
      : path.startsWith("/team")
        ? "team"
        : path.startsWith("/settings")
          ? "settings"
          : path.startsWith("/account")
            ? "account"
            : "overview";

  return (
    <div className="app">
      <Rail activeId={active} session={session} scopes={scopes} users={users} />
      <main className="main">{children}</main>
    </div>
  );
}
