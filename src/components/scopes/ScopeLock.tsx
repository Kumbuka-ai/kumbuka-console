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
 * can toggle it. The server is the guarantee; this is UX + the endpoint call.
 * The console never audits: the server emits the scope.lock / scope.unlock event.
 *
 * Admin: a real <button aria-pressed> (closed lock/accent when locked, open
 * lock/grey when unlocked) that opens a plain confirm with an audit hint.
 * Member: a non-interactive status badge (an <output>, implicit role="status")
 * — never a button — so the lock state is transparent without an action they
 * can't take.
 */
export function ScopeLock({ scope, isAdmin }: Readonly<{ scope: ScopeView; isAdmin: boolean }>) {
  const t = useTranslations("scopes.lock");
  if (!isAdmin) return <MemberLockBadge locked={scope.locked} t={t} />;
  return <AdminLockToggle scope={scope} t={t} />;
}

type T = ReturnType<typeof useTranslations<"scopes.lock">>;

function MemberLockBadge({ locked, t }: Readonly<{ locked: boolean; t: T }>) {
  const tip = locked ? t("tip.memberLocked") : t("tip.memberOpen");
  return (
    <output className={`scope-lock member${locked ? " locked" : ""}`} title={tip} aria-label={tip}>
      <Icon name={locked ? "lock" : "lockOpen"} />
    </output>
  );
}

function AdminLockToggle({ scope, t }: Readonly<{ scope: ScopeView; t: T }>) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const locked = scope.locked;

  // One ternary collapses the whole open/locked copy + action — keeps this
  // component well under the cognitive-complexity gate.
  const c = locked
    ? {
        tip: t("tip.adminLocked"),
        eyebrow: t("confirm.unlockEyebrow"),
        title: t("confirm.unlockTitle", { slug: scope.slug }),
        body: t("confirm.unlockBody"),
        confirm: t("confirm.unlock"),
        icon: "lockOpen" as const,
        run: unlockScopeAction,
        done: t("toast.unlocked"),
      }
    : {
        tip: t("tip.adminOpen"),
        eyebrow: t("confirm.lockEyebrow"),
        title: t("confirm.lockTitle", { slug: scope.slug }),
        body: t("confirm.lockBody"),
        confirm: t("confirm.lock"),
        icon: "lock" as const,
        run: lockScopeAction,
        done: t("toast.locked"),
      };

  const apply = () => {
    start(async () => {
      const res = await c.run(scope.slug).catch(() => ({ ok: false as const }));
      if (!res.ok) {
        toast.push({ message: t("toast.failed") });
        return;
      }
      toast.push({ message: c.done });
      setConfirm(false);
    });
  };

  return (
    <>
      <button
        type="button"
        className={`scope-lock admin${locked ? " locked" : ""}`}
        aria-pressed={locked}
        title={c.tip}
        aria-label={c.tip}
        onClick={() => setConfirm(true)}
      >
        <Icon name={locked ? "lock" : "lockOpen"} />
      </button>
      {confirm ? (
        <ConfirmModal
          eyebrow={c.eyebrow}
          title={c.title}
          body={c.body}
          target={scope.slug}
          confirmLabel={pending ? t("confirm.working") : c.confirm}
          confirmIcon={c.icon}
          onCancel={() => setConfirm(false)}
          onConfirm={apply}
        />
      ) : null}
    </>
  );
}
