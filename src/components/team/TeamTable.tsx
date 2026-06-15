"use client";

import { useMemo, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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

// Module-scope rich-text renderers (not defined during render).
const richB = (c: ReactNode) => <b>{c}</b>;
const richIdp = (c: ReactNode) => <span className="idp-name">{c}</span>;

type ConfirmAction = "disable" | "enable" | "mute" | "unmute";

// Visual chrome per action; the copy lives in the team.confirm messages.
const CONFIRM_CHROME: Record<ConfirmAction, { icon: "shield" | "eyeOff"; danger: boolean }> = {
  enable: { icon: "shield", danger: false },
  disable: { icon: "eyeOff", danger: true },
  mute: { icon: "eyeOff", danger: false },
  unmute: { icon: "shield", danger: false },
};

type ConfirmT = ReturnType<typeof useTranslations>;

/**
 * Copy + chrome for the confirm modal, by action. The text is resolved through
 * a next-intl translator for the "team.confirm" namespace (passed in, since
 * this is a plain function — exported for unit tests).
 */
export function confirmCopy(
  action: ConfirmAction,
  name: string,
  t: ConfirmT,
): { eyebrow: string; title: string; body: string; icon: "shield" | "eyeOff"; danger: boolean } {
  return {
    eyebrow: t(`${action}.eyebrow`),
    title: t(`${action}.title`, { name }),
    body: t(`${action}.body`),
    ...CONFIRM_CHROME[action],
  };
}

export function TeamTable({ users }: Readonly<{ users: UserView[] }>) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const t = useTranslations("team");
  const tc = useTranslations("team.confirm");
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
        label: u.role === "admin" ? t("menu.makeMember") : t("menu.makeAdmin"),
        icon: "user",
        disabled: lastAdminGuard && u.role === "admin",
        onSelect: () =>
          start(async () => {
            try {
              await updateUserAction(u.id, { role: u.role === "admin" ? "member" : "admin" });
              toast.push({
                message:
                  u.role === "admin"
                    ? t("toast.nowMember", { name: u.displayName })
                    : t("toast.nowAdmin", { name: u.displayName }),
              });
            } catch (err) {
              toast.push({ message: err instanceof Error ? err.message : t("toast.updateFailed") });
            }
          }),
      },
      { kind: "sep" },
      u.muted
        ? {
            label: t("menu.unmuteMember"),
            icon: "edit",
            onSelect: () => setConfirm({ user: u, action: "unmute" }),
          }
        : {
            label: t("menu.muteMember"),
            icon: "eyeOff",
            disabled: u.self,   // you can't mute yourself
            onSelect: () => setConfirm({ user: u, action: "mute" }),
          },
      { kind: "sep" },
      u.status === "disabled"
        ? {
            label: t("menu.enableAccount"),
            icon: "shield",
            onSelect: () => setConfirm({ user: u, action: "enable" }),
          }
        : {
            label: t("menu.disableAccount"),
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
          toast.push({
            message: t(action === "mute" ? "toast.muted" : "toast.unmuted", { name: user.displayName }),
          });
        } else {
          await updateUserAction(user.id, { status: action === "enable" ? "active" : "disabled" });
          toast.push({
            message: t(action === "enable" ? "toast.enabled" : "toast.disabled", { name: user.displayName }),
          });
        }
        setConfirm(null);
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("toast.updateFailed") });
      }
    });
  };

  let confirmModal: ReactNode = null;
  if (confirm) {
    const c = confirmCopy(confirm.action, confirm.user.displayName, tc);
    const confirmLabel = pending ? t("confirmAction.working") : t(`confirmAction.${confirm.action}`);
    confirmModal = (
      <ConfirmModal
        eyebrow={c.eyebrow}
        title={c.title}
        body={c.body}
        target={confirm.user.email}
        confirmLabel={confirmLabel}
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
        <span>{t.rich("idpBanner", { idp: richIdp, b: richB })}</span>
      </div>

      <div className="team-toolbar">
        <div className="search" style={{ maxWidth: 320 }}>
          <Icon name="search" />
          <input
            defaultValue={query}
            onChange={(e) => setParam("q", e.target.value || null)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAria")}
          />
        </div>
        <Seg ariaLabel={t("filterAria")}>
          <SegButton on={roleFilter === "all"} onClick={() => setParam("role", null)}>
            {t("filterAll")}
          </SegButton>
          <SegButton on={roleFilter === "admin"} onClick={() => setParam("role", "admin")}>
            {t("filterAdmins")}
          </SegButton>
          <SegButton on={roleFilter === "member"} onClick={() => setParam("role", "member")}>
            {t("filterMembers")}
          </SegButton>
        </Seg>
        <span className="result-count">
          {t("resultCount", { shown: rows.length, total: users.length })}
        </span>
        <span className="spacer" />
        <Button variant="primary" onClick={() => setInviting(true)}>
          <Icon name="mail" />
          <span className="txt">{t("inviteBtn")}</span>
        </Button>
      </div>

      <div className="team-body">
        {rows.length === 0 ? (
          <EmptyState icon="users" title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          <table className="utable">
            <thead>
              <tr>
                <th style={{ width: "38%" }}>{t("colMember")}</th>
                <th style={{ width: 140 }}>{t("colRole")}</th>
                <th style={{ width: 150 }}>{t("colStatus")}</th>
                <th style={{ width: 150 }}>{t("colLastActive")}</th>
                <th style={{ width: 56 }} aria-label={t("actionsAria")} />
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
                              {t("you")}
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
                        <span className="mute-badge mono" title={t("mutedTitle")}>
                          {t("mutedBadge")}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    <UserStatus status={u.status} />
                  </td>
                  <td>
                    <span className="u-last">{u.lastSeenAt ? relTime(u.lastSeenAt) : t("never")}</span>
                  </td>
                  <td>
                    <button
                      className="row-menu-btn"
                      style={{ opacity: 1 }}
                      aria-label={t("rowActionsAria", { name: u.displayName })}
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
