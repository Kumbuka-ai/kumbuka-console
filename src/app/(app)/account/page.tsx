import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { AccountForm } from "@/components/account/AccountForm";
import { requireSession } from "@/lib/api/session";
import { listSessions, listCredentials } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import type { ActiveSession, CredentialView } from "@/lib/api/types";

export default async function AccountPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  // Active connections + credentials are best-effort: a Keycloak hiccup must
  // not take the whole account page down. On failure we pass null and the
  // affected card falls back to the Keycloak link-out.
  let sessions: ActiveSession[] | null = null;
  try {
    sessions = await listSessions();
  } catch {
    sessions = null;
  }
  let credentials: CredentialView[] | null = null;
  try {
    credentials = await listCredentials();
  } catch {
    credentials = null;
  }
  const t = await getTranslations("header");
  return (
    <>
      <Topbar title={t("account_title")} meta={t("account_meta")} theme={theme} />
      <AccountForm session={session} sessions={sessions} credentials={credentials} />
    </>
  );
}
