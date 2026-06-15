import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

const richB = (c: ReactNode) => <b style={{ color: "var(--c-text-2)", fontWeight: 600 }}>{c}</b>;

/**
 * Private-guarantee panel — surface 1 of 5 (see handoff).
 * Persistent, non-interactive. There is no scope to "enter".
 */
export function PrivatePanel() {
  const t = useTranslations("scopes.private");
  return (
    <div className="private-panel" title={t("titleAttr")}>
      <div className="pp-head">
        <div className="pp-lock">
          <Icon name="lock" />
        </div>
        <div>
          <div className="pp-title">{t("title")}</div>
          <div className="pp-tag">{t("tag")}</div>
        </div>
      </div>
      <div className="pp-body">{t.rich("body", { b: richB })}</div>
      <div className="pp-foot">
        <Icon name="ok" />
        {t("foot")}
      </div>
    </div>
  );
}
