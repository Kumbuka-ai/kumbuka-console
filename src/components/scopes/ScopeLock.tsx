"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { lockScopeAction, unlockScopeAction } from "@/app/(app)/actions";
import type { ScopeView } from "@/lib/api/types";

/**
 * FEAT-19 / D-CORE-18 scope content-lock control (icon-only), in the entries
 * header. Visible to everyone — it reflects the lock state — but only an admin
 * can toggle it. The server is the guarantee (a member who forged a call is
 * rejected by @RolesAllowed); this is UX + the endpoint call. The console never
 * audits: the server emits the scope.lock / scope.unlock governance event.
 *
 * Admin: a real <button aria-pressed> (closed lock = locked/accent, open lock =
 * unlocked/grey) that opens a plain confirm with an audit hint. Member: a
 * non-interactive role="status" badge — never a button — so the lock state is
 * transparent without offering an action they can't take.
 */
export function ScopeLock({ scope, isAdmin }: Readonly<{ scope: ScopeView; isAdmin: boolean }>) {
  const t = useTranslations("scopes.lock");
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const locked = scope.locked;
  const iconName = locked ? "lock" : "lockOpen";

  // Member: non-interactive status reflecting the state (design §B1).
  if (!isAdmin) {
    const tip = locked ? t("tip.memberLocked") : t("tip.memberOpen");
    return (
      <span
        className={`scope-lock member${locked ? " locked" : ""}`}
        role="status"
        title={tip}
        aria-label={tip}
      >
        <Icon name={iconName} />
      </span>
    );
  }

  const tip = locked ? t("tip.adminLocked") : t("tip.adminOpen");

  const apply = () => {
    start(async () => {
      const action = locked ? unlockScopeAction : lockScopeAction;
      const res = await action(scope.slug).catch(() => ({ ok: false as const }));
      if (!res.ok) {
        toast.push({ message: t("toast.failed") });
        return;
      }
      toast.push({ message: locked ? t("toast.unlocked") : t("toast.locked") });
      setConfirm(false);
    });
  };

  return (
    <>
      <button
        type="button"
        className={`scope-lock admin${locked ? " locked" : ""}`}
        aria-pressed={locked}
        title={tip}
        aria-label={tip}
        onClick={() => setConfirm(true)}
      >
        <Icon name={iconName} />
      </button>
      {confirm ? (
        <ConfirmModal
          eyebrow={locked ? t("confirm.unlockEyebrow") : t("confirm.lockEyebrow")}
          title={locked ? t("confirm.unlockTitle", { slug: scope.slug }) : t("confirm.lockTitle", { slug: scope.slug })}
          body={locked ? t("confirm.unlockBody") : t("confirm.lockBody")}
          target={scope.slug}
          confirmLabel={pending ? t("confirm.working") : locked ? t("confirm.unlock") : t("confirm.lock")}
          confirmIcon={locked ? "lockOpen" : "lock"}
          onCancel={() => setConfirm(false)}
          onConfirm={apply}
        />
      ) : null}
    </>
  );
}
