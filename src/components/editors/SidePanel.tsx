"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";

export function SidePanel({
  ariaLabel,
  eyebrow,
  title,
  footer,
  children,
  onClose,
}: Readonly<{
  ariaLabel: string;
  eyebrow: string;
  title: string;
  footer: ReactNode;
  children: ReactNode;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");
  useEffect(() => {
    const focusable = ref.current?.querySelector<HTMLElement>(
      "input, textarea, button, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden />
      <div
        className="sidepanel"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={ref}
      >
        <div className="sp-head">
          <div>
            <span className="eyebrow">{"// "}{eyebrow}</span>
            <h3>{title}</h3>
          </div>
          <button className="iconbtn x" onClick={onClose} aria-label={t("close")} type="button">
            <Icon name="x" />
          </button>
        </div>
        <div className="sp-body">{children}</div>
        <div className="sp-foot">{footer}</div>
      </div>
    </>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}>) {
  return (
    <div className="field">
      <label>
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      {hint ? <span className="hint">{hint}</span> : null}
      {children}
    </div>
  );
}
