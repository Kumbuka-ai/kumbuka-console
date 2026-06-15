import { useTranslations } from "next-intl";
import type { UserStatus as Status } from "@/lib/api/types";

export function UserStatus({ status }: Readonly<{ status: Status }>) {
  const t = useTranslations("team.status");
  return (
    <span className={`ustatus ${status}`}>
      <span className="dot" />
      {t(status)}
    </span>
  );
}
