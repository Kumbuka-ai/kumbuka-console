import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, listEntries, listScopes, listDirectory, getSettings } from "@/lib/api";
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
  const [scopes, directory, theme, session, settings] = await Promise.all([
    listScopes(),
    listDirectory(),   // member-safe author-name resolution (not the roster)
    getTheme(),
    requireSession(),
    getSettings(),
  ]);
  const scope = scopes.find((s) => s.slug === slug);
  if (!scope) notFound();

  // D-CORE: scope creation is gated by the tenant's createScopes setting.
  // Admins may always create; members only when createScopes === "members".
  // Hide the "+" affordance otherwise — the backend enforces this regardless.
  const canCreateScopes = session.role === "admin" || settings.createScopes === "members";
  // Scope lifecycle (rename / archive / un-archive) is admin-only (dogfood-16).
  const isAdmin = session.role === "admin";

  let entries: Awaited<ReturnType<typeof listEntries>> = [];
  let syncError = false;
  try {
    entries = await listEntries(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status >= 500) syncError = true;
    else if (err instanceof Error && /sync/i.test(err.message)) syncError = true;
    else throw err;
  }

  const members = Object.fromEntries(directory.map((u) => [u.subject, u.displayName ?? u.subject]));
  const activeScopes = scopes.filter((s) => !s.archived).length;
  const t = await getTranslations("header");

  return (
    <>
      <Topbar
        title={t("scopes_title")}
        meta={t("scopes_meta")}
        theme={theme}
        trailing={
          <span className="result-count" style={{ marginRight: 4 }}>
            {t("scopes_active", { count: activeScopes })}
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
        canCreateScopes={canCreateScopes}
        isAdmin={isAdmin}
        initialCollapsed={session.settings?.scopesCollapsed ?? false}
      />
    </>
  );
}
