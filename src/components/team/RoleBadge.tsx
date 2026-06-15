import { useTranslations } from "next-intl";
import type { UserRole } from "@/lib/api/types";

export function RoleBadge({ role }: Readonly<{ role: UserRole }>) {
  const t = useTranslations("roles");
  return (
    <span className={`rolebadge${role === "admin" ? " admin" : ""}`}>
      <span className="dot" />
      {t(role)}
    </span>
  );
}
