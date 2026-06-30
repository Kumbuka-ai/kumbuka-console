"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { FeedbackDialog } from "./FeedbackDialog";

/**
 * FEAT-11 — discreet feedback entry point, rendered in the layout footer
 * alongside the version chips. Opens the beta feedback form. Kept small and
 * unobtrusive: this is a beta channel, not a primary navigation item.
 */
export function FeedbackLink() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="footer-link" onClick={() => setOpen(true)}>
        <Icon name="message" />
        <span>{t("entry")}</span>
      </button>
      {open ? <FeedbackDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
