import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { TeamTable } from "@/components/team/TeamTable";
import { listUsers } from "@/lib/api";
import { getTheme } from "@/lib/theme";

export default async function TeamPage() {
  const [users, theme] = await Promise.all([listUsers(), getTheme()]);
  const t = await getTranslations("header");
  return (
    <>
      <Topbar title={t("team_title")} meta={t("team_meta")} theme={theme} />
      <TeamTable users={users} />
    </>
  );
}
