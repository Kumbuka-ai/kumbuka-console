import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { TeamTable } from "@/components/team/TeamTable";
import { listUsers } from "@/lib/api";
import { requireSession } from "@/lib/api/session";
import { getTheme } from "@/lib/theme";

export default async function TeamPage() {
  // RBAC (server-enforced, not just hidden in the rail): the team tab is
  // admin-only. A plain member is redirected; the mutating endpoints are
  // independently @RolesAllowed("admin") on the backend.
  const session = await requireSession();
  if (session.role !== "admin") {
    redirect("/overview");
  }

  const [users, theme] = await Promise.all([listUsers(), getTheme()]);
  const t = await getTranslations("header");
  return (
    <>
      <Topbar title={t("team_title")} meta={t("team_meta")} theme={theme} />
      <TeamTable users={users} />
    </>
  );
}
