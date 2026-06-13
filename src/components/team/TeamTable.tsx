"use client";

import { useMemo, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Seg, SegButton } from "@/components/ui/Seg";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { InviteDialog } from "./InviteDialog";
import { RoleBadge } from "./RoleBadge";
import { UserStatus } from "./UserStatus";
import { EmptyState } from "@/components/ui/State";
import { relTime } from "@/lib/time";
import { updateUserAction } from "@/app/(app)/actions";
import type { UserView } from "@/lib/api/types";

const IDP_NAME = "Keycloak";

type ConfirmAction = "disable" | "enable" | "mute" | "unmute";

const CONFIRM_LABELS: Record<ConfirmAction, string> = {
  enable: "Enable",
  disable: "Disable",
  mute: "Mute",
  unmute: "Unmute",
};

function confirmLabelFor(pending: boolean, action: ConfirmAction): string {
  return pending ? "Working…" : CONFIRM_LABELS[action];
}

/** Copy + chrome for the confirm modal, by action. Flat lookup, no nested ternary. */
export function confirmCopy(
  action: ConfirmAction,
  name: string,
): { eyebrow: string; title: string; body: string; icon: "shield" | "eyeOff"; danger: boolean } {
  switch (action) {
    case "enable":
      return {
        eyebrow: "enable account",
        title: `Enable ${name}?`,
        body: "They regain console and API access immediately. Their private memory was never touched.",
        icon: "shield",
        danger: false,
      };
    case "disable":
      return {
        eyebrow: "disable account",
        title: `Disable ${name}?`,
        body: `They lose console and API access immediately. ${IDP_NAME} suspends the account; their private memory is untouched and stays theirs.`,
        icon: "eyeOff",
        danger: true,
      };
    case "mute":
      return {
        eyebrow: "mute member",
        title: `Mute ${name}?`,
        body: "Shared writes are suspended — on this console and through the assistant. Reading is unaffected, and their private memory stays fully theirs. Reversible anytime.",
        icon: "eyeOff",
        danger: false,
      };
    case "unmute":
      return {
        eyebrow: "unmute member",
        title: `Unmute ${name}?`,
        body: "Shared writes resume immediately — on this console and through the assistant.",
        icon: "shield",
        danger: false,
      };
  }
}

export function TeamTable({ users }: Readonly<{ users: UserView[] }>) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState<{
    user: UserView;
    action: ConfirmAction;
  } | null>(null);
  const [pending, start] = useTransition();

  const roleFilter = (params.get("role") as "all" | "admin" | "member") ?? "all";
  const query = params.get("q") ?? "";

  const adminCount = users.filter((u) => u.role === "admin" && u.status !== "disabled").length;

  const rows = useMemo(() => {
    let r = users.slice();
    if (roleFilter !== "all") r = r.filter((u) => u.role === roleFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return r;
  }, [users, roleFilter, query]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const openUserMenu = (e: MouseEvent, u: UserView) => {
    const lastAdminGuard = u.role === "admin" && adminCount <= 1;
    menu.open(e, [
      {
        label: u.role === "admin" ? "Make member" : "Make admin",
        icon: "user",
        disabled: lastAdminGuard && u.role === "admin",
        onSelect: () =>
          start(async () => {
            try {
              await updateUserAction(u.id, { role: u.role === "admin" ? "member" : "admin" });
              toast.push({
                message: `${u.displayName} is now ${u.role === "admin" ? "a member" : "an admin"}`,
              });
            } catch (err) {
              toast.push({ message: err instanceof Error ? err.message : "Update failed" });
            }
          }),
      },
      { kind: "sep" },
      u.muted
        ? {
            label: "Unmute member",
            icon: "edit",
            onSelect: () => setConfirm({ user: u, action: "unmute" }),
          }
        : {
            label: "Mute member",
            icon: "eyeOff",
            disabled: u.self,   // you can't mute yourself
            onSelect: () => setConfirm({ user: u, action: "mute" }),
          },
      { kind: "sep" },
      u.status === "disabled"
        ? {
            label: "Enable account",
            icon: "shield",
            onSelect: () => setConfirm({ user: u, action: "enable" }),
          }
        : {
            label: "Disable account",
            icon: "eyeOff",
            danger: true,
            disabled: u.self || (u.role === "admin" && lastAdminGuard),
            onSelect: () => setConfirm({ user: u, action: "disable" }),
          },
    ]);
  };

  const doConfirm = () => {
    if (!confirm) return;
    const { user, action } = confirm;
    start(async () => {
      try {
        if (action === "mute" || action === "unmute") {
          await updateUserAction(user.id, { muted: action === "mute" });
          toast.push({ message: `${user.displayName} ${action === "mute" ? "muted" : "unmuted"}` });
        } else {
          await updateUserAction(user.id, { status: action === "enable" ? "active" : "disabled" });
          toast.push({ message: `${user.displayName} ${action === "enable" ? "enabled" : "disabled"}` });
        }
        setConfirm(null);
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Update failed" });
      }
    });
  };

  let confirmModal: ReactNode = null;
  if (confirm) {
    const c = confirmCopy(confirm.action, confirm.user.displayName);
    confirmModal = (
      <ConfirmModal
        eyebrow={c.eyebrow}
        title={c.title}
        body={c.body}
        target={confirm.user.email}
        confirmLabel={confirmLabelFor(pending, confirm.action)}
        confirmIcon={c.icon}
        danger={c.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={doConfirm}
      />
    );
  }

  return (
    <div className="team-screen">
      <div className="idp-banner">
        <Icon name="shield" />
        <span>
          Accounts are managed in <span className="idp-name">{IDP_NAME}</span>. <b>Create</b>,{" "}
          <b>disable</b>, and <b>role</b> changes here write through to the directory — they are
          not local to this console. Each member&apos;s <b>private</b> memory remains theirs.
        </span>
      </div>

      <div className="team-toolbar">
        <div className="search" style={{ maxWidth: 320 }}>
          <Icon name="search" />
          <input
            defaultValue={query}
            onChange={(e) => setParam("q", e.target.value || null)}
            placeholder="Search name or email…"
            aria-label="Search members"
          />
        </div>
        <Seg ariaLabel="Filter by role">
          <SegButton on={roleFilter === "all"} onClick={() => setParam("role", null)}>
            All
          </SegButton>
          <SegButton on={roleFilter === "admin"} onClick={() => setParam("role", "admin")}>
            Admins
          </SegButton>
          <SegButton on={roleFilter === "member"} onClick={() => setParam("role", "member")}>
            Members
          </SegButton>
        </Seg>
        <span className="result-count">
          {rows.length} of {users.length}
        </span>
        <span className="spacer" />
        <Button variant="primary" onClick={() => setInviting(true)}>
          <Icon name="mail" />
          <span className="txt">Invite member</span>
        </Button>
      </div>

      <div className="team-body">
        {rows.length === 0 ? (
          <EmptyState icon="users" title="No members match" body="Adjust the search or role filter." />
        ) : (
          <table className="utable">
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Member</th>
                <th style={{ width: 140 }}>Role</th>
                <th style={{ width: 150 }}>Status</th>
                <th style={{ width: 150 }}>Last active</th>
                <th style={{ width: 56 }} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={u.status === "disabled" ? "u-disabled" : undefined}>
                  <td>
                    <div className="u-id">
                      <Avatar initials={initialsOf(u.displayName)} />
                      <div>
                        <div className="u-name">
                          {u.displayName}
                          {u.self ? (
                            <span className="scope-flag" style={{ marginLeft: 9 }}>
                              you
                            </span>
                          ) : null}
                        </div>
                        <div className="u-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-cell">
                      <RoleBadge role={u.role} />
                      {u.muted ? (
                        <span className="mute-badge mono" title="Shared writes suspended">
                          muted
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    <UserStatus status={u.status} />
                  </td>
                  <td>
                    <span className="u-last">{u.lastSeenAt ? relTime(u.lastSeenAt) : "never"}</span>
                  </td>
                  <td>
                    <button
                      className="row-menu-btn"
                      style={{ opacity: 1 }}
                      aria-label={`Actions for ${u.displayName}`}
                      onClick={(ev) => openUserMenu(ev, u)}
                      type="button"
                    >
                      <Icon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
      {confirmModal}
      {menu.node}
    </div>
  );
}
