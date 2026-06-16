import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getConnector, getSettings, listScopes } from "@/lib/api";
import { requireSession } from "@/lib/api/session";
import { getTheme } from "@/lib/theme";

export default async function SettingsPage() {
  const [session, settings, connector, scopes, theme] = await Promise.all([
    requireSession(),
    getSettings(),
    getConnector(),
    listScopes(),
    getTheme(),
  ]);
  const projectScopes = scopes.filter((s) => s.kind === "project" && !s.archived);
  const t = await getTranslations("header");
  // Settings are admin-write (AdminSettingsResource PUT is admin-only). The GET
  // is member-readable by design, so a member sees the current values read-only.
  const isAdmin = session.role === "admin";
  return (
    <>
      <Topbar title={t("settings_title")} meta={t("settings_meta")} theme={theme} />
      <SettingsForm
        initial={settings}
        connector={connector}
        projectScopes={projectScopes}
        isAdmin={isAdmin}
      />
    </>
  );
}
