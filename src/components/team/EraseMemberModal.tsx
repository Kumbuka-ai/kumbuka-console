"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import type { UserView } from "@/lib/api/types";

/**
 * High-friction confirm for the permanent member erasure (D-OPS-16). Distinct
 * from the reversible Disable: the admin must type the member's email verbatim
 * to arm the destructive action — the same value the server re-validates. The
 * modal never shows private content; erasure purges by subject (P1).
 */
export function EraseMemberModal({
  user,
  pending,
  onCancel,
  onConfirm,
}: Readonly<{
  user: UserView;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (typedConfirm: string) => void;
}>) {
  const t = useTranslations("team.erase");
  const [typed, setTyped] = useState("");
  const armed = typed.trim().toLowerCase() === user.email.toLowerCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div className="scrim" onClick={onCancel} aria-hidden />
      <div className="modal" role="alertdialog" aria-label={t("title", { name: user.displayName })} aria-modal="true">
        <div className="modal-body">
          <span className="eyebrow">{"// "}{t("eyebrow")}</span>
          <h3>{t("title", { name: user.displayName })}</h3>
          <p>{t("body")}</p>
          <p className="warn">{t("permanent")}</p>
          <label className="erase-confirm">
            <span>{t("typePrompt")}</span>
            <div className="target">{user.email}</div>
            <input
              type="text"
              autoComplete="off"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={user.email}
              aria-label={t("typeAria")}
            />
          </label>
        </div>
        <div className="modal-foot">
          <Button onClick={onCancel}>{t("cancel")}</Button>
          <Button variant="danger" disabled={!armed || pending} onClick={() => onConfirm(typed.trim())}>
            <Icon name="eyeOff" />
            <span className="txt">{pending ? t("working") : t("confirm")}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
