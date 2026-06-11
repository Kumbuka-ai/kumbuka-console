import type { UserRole } from "@/lib/api/types";

export function RoleBadge({ role }: Readonly<{ role: UserRole }>) {
  return (
    <span className={`rolebadge${role === "admin" ? " admin" : ""}`}>
      <span className="dot" />
      {role}
    </span>
  );
}
