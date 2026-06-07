import { Topbar } from "@/components/shell/Topbar";
import { AccountForm } from "@/components/account/AccountForm";
import { requireSession } from "@/lib/api/session";
import { getTheme } from "@/lib/theme";

export default async function AccountPage() {
  const [session, theme] = await Promise.all([requireSession(), getTheme()]);
  return (
    <>
      <Topbar title="Account" meta="your settings" theme={theme} />
      <AccountForm session={session} />
    </>
  );
}
