"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Chip";
import { ENTRY_TYPE_ORDER } from "@/lib/api/types";

const richB = (c: ReactNode) => <b>{c}</b>;

/**
 * Step 1 — "How kumbuka works" (static, no input). The orientation / aha step:
 * the six entry types (real TypeChips + their localized descriptions), the
 * assistant↔memory flow (the single accent used once), and the global/project
 * scope model anchored by the private-memory guarantee (the same
 * `.private-panel` treatment surfaced elsewhere).
 */
export function WizardExplain() {
  const t = useTranslations("onboarding.explain");
  const tTypes = useTranslations("entryTypes");
  return (
    <div className="wz-explain">
      <section className="wz-sec">
        <span className="eyebrow">{"// "}{t("mnemonicsEyebrow")}</span>
        <p className="wz-lead">{t.rich("mnemonicsLead", { b: richB })}</p>
        <div className="wz-types">
          {ENTRY_TYPE_ORDER.map((type) => (
            <div className="wz-type" key={type}>
              <TypeChip type={type} boxed />
              <span className="wz-type-desc">{tTypes(`${type}.description`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wz-sec">
        <span className="eyebrow">{"// "}{t("flowEyebrow")}</span>
        <div className="wz-flow">
          <div className="wz-node">
            <span className="wz-node-icon"><Icon name="bot" /></span>
            <div className="wz-node-name">{t("assistant")}</div>
            <div className="wz-node-sub">{t("assistantSub")}</div>
          </div>
          <div className="wz-flow-mid">
            <span className="wz-arrow">{t("reads")}&nbsp;→</span>
            <span className="wz-arrow back">←&nbsp;{t("writes")}</span>
          </div>
          <div className="wz-node accent">
            <span className="wz-node-icon"><Icon name="layers" /></span>
            <div className="wz-node-name">{t("memory")}</div>
            <div className="wz-node-sub">{t("memorySub")}</div>
          </div>
        </div>
        <p className="wz-note">{t("flowNote")}</p>
      </section>

      <section className="wz-sec">
        <span className="eyebrow">{"// "}{t("scopesEyebrow")}</span>
        <p className="wz-lead">{t.rich("scopesLead", { b: richB })}</p>
        <div className="wz-scopes">
          <div className="wz-scope">
            <div className="wz-scope-head"><Icon name="globe" /><span>{t("globalTitle")}</span></div>
            <p>{t("globalDesc")}</p>
          </div>
          <div className="wz-scope">
            <div className="wz-scope-head"><Icon name="folder" /><span>{t("projectTitle")}</span></div>
            <p>{t("projectDesc")}</p>
          </div>
        </div>
        <div className="wz-private private-panel">
          <div className="pp-head">
            <div className="pp-lock"><Icon name="lock" /></div>
            <div>
              <div className="pp-title">{t("privateTitle")}</div>
              <div className="pp-tag">{t("privateTag")}</div>
            </div>
          </div>
          <p className="pp-body">{t("privateBody")}</p>
          <div className="pp-foot"><Icon name="ok" />{t("privateFoot")}</div>
        </div>
      </section>
    </div>
  );
}
