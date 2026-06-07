import type { UserStatus as Status } from "@/lib/api/types";

const LABEL: Record<Status, string> = {
  active: "Active",
  disabled: "Disabled",
  invited: "Invite sent",
};

export function UserStatus({ status }: { status: Status }) {
  return (
    <span className={`ustatus ${status}`}>
      <span className="dot" />
      {LABEL[status]}
    </span>
  );
}
