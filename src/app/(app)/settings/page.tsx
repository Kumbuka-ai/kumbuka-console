import { Topbar } from "@/components/shell/Topbar";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getConnector, getSettings, listScopes } from "@/lib/api";
import { getTheme } from "@/lib/theme";

export default async function SettingsPage() {
  const [settings, connector, scopes, theme] = await Promise.all([
    getSettings(),
    getConnector(),
    listScopes(),
    getTheme(),
  ]);
  const projectScopes = scopes.filter((s) => s.kind === "project" && !s.archived);
  return (
    <>
      <Topbar title="Settings" meta="configuration" theme={theme} />
      <SettingsForm initial={settings} connector={connector} projectScopes={projectScopes} />
    </>
  );
}
