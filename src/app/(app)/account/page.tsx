import { Topbar } from "@/components/shell/Topbar";
import { AccountForm } from "@/components/account/AccountForm";
import { requireSession } from "@/lib/api/session";
import { listSessions } from "@/lib/api";
import { getTheme } from "@/lib/theme";
import type { ActiveSession } from "@/lib/api/types";

export default async function AccountPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  // Active connections are best-effort: a Keycloak hiccup must not take the
  // whole account page down. On failure we pass null and the form falls back
  // to the Keycloak link-out.
  let sessions: ActiveSession[] | null = null;
  try {
    sessions = await listSessions();
  } catch {
    sessions = null;
  }
  return (
    <>
      <Topbar title="Account" meta="your settings" theme={theme} />
      <AccountForm session={session} sessions={sessions} />
    </>
  );
}
