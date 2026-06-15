"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export function ConfirmModal({
  eyebrow,
  title,
  body,
  target,
  confirmLabel,
  confirmIcon,
  danger,
  onCancel,
  onConfirm,
}: Readonly<{
  eyebrow: string;
  title: string;
  body: string;
  target?: string;
  confirmLabel: string;
  confirmIcon?: IconName;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const t = useTranslations("common");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <>
      <div className="scrim" onClick={onCancel} aria-hidden />
      <div className="modal" role="alertdialog" aria-label={title} aria-modal="true">
        <div className="modal-body">
          <span className="eyebrow" style={danger ? undefined : { color: "var(--c-accent)" }}>
            {"// "}{eyebrow}
          </span>
          <h3>{title}</h3>
          <p>{body}</p>
          {target ? <div className="target">{target}</div> : null}
        </div>
        <div className="modal-foot">
          <Button onClick={onCancel}>{t("cancel")}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmIcon ? <Icon name={confirmIcon} /> : null}
            <span className="txt">{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
