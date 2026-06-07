import { Topbar } from "@/components/shell/Topbar";
import { TeamTable } from "@/components/team/TeamTable";
import { listUsers } from "@/lib/api";
import { getTheme } from "@/lib/theme";

export default async function TeamPage() {
  const [users, theme] = await Promise.all([listUsers(), getTheme()]);
  return (
    <>
      <Topbar title="Team & users" meta="directory" theme={theme} />
      <TeamTable users={users} />
    </>
  );
}
