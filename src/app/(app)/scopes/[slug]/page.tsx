import { notFound } from "next/navigation";
import { ApiError, listEntries, listScopes, listUsers } from "@/lib/api";
import { requireSession } from "@/lib/api/session";
import { ScopeScreen } from "@/components/scopes/ScopeScreen";
import { Topbar } from "@/components/shell/Topbar";
import { getTheme } from "@/lib/theme";

export default async function ScopeBrowserPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const [scopes, users, theme, session] = await Promise.all([
    listScopes(),
    listUsers(),
    getTheme(),
    requireSession(),
  ]);
  const scope = scopes.find((s) => s.slug === slug);
  if (!scope) notFound();

  let entries: Awaited<ReturnType<typeof listEntries>> = [];
  let syncError = false;
  try {
    entries = await listEntries(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status >= 500) syncError = true;
    else if (err instanceof Error && /sync/i.test(err.message)) syncError = true;
    else throw err;
  }

  const members = Object.fromEntries(users.map((u) => [u.subject, u.displayName]));
  const activeScopes = scopes.filter((s) => !s.archived).length;

  return (
    <>
      <Topbar
        title="Shared memory"
        meta="scope browser"
        theme={theme}
        trailing={
          <span className="result-count" style={{ marginRight: 4 }}>
            {activeScopes} active scopes
          </span>
        }
      />
      <ScopeScreen
        scopes={scopes}
        activeSlug={slug}
        scope={scope}
        entries={entries}
        members={members}
        syncError={syncError}
        callerMuted={session.muted}
      />
    </>
  );
}
