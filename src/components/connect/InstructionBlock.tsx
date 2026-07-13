"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { ScopeView } from "@/lib/api/types";

/**
 * Block 2 — "Anweisung für den Assistenten". Scope picker + the generated
 * instruction block + copy button; stays permanently visible (scopes get
 * switched). Two paths, both needed:
 *
 *  - Path A (the normal case): the block goes into the client's project
 *    instructions; the assistant loads the scope's context from the first
 *    turn of every session.
 *  - Path B (its own, subordinate step): a one-sentence copy for the
 *    ad-hoc case without project instructions.
 *
 * The block's wording is canonical and pinned by test — it is a GUEST in
 * the user's project instructions and competes with their own rules;
 * brevity is survival strategy. The gatekeeper paragraph stays verbatim
 * (it comes from a real incident). The literal slug is interpolated into
 * the SAME string that is displayed and copied, so the two cannot drift.
 */
export function InstructionBlock({ scopes }: Readonly<{ scopes: ScopeView[] }>) {
  const t = useTranslations("connect.instruction");
  const toast = useToast();
  const pinnable = scopes.filter((s) => !s.archived);
  const [slug, setSlug] = useState<string>(
    () => pinnable.find((s) => s.kind === "global")?.slug ?? pinnable[0]?.slug ?? "global",
  );

  const block = t("block", { slug });
  const oneOff = t("oneOff", { slug });
  const copyBlock = async () => {
    await navigator.clipboard?.writeText(block);
    toast.push({ message: t("blockCopied") });
  };
  const copyOneOff = async () => {
    await navigator.clipboard?.writeText(oneOff);
    toast.push({ message: t("sentenceCopied") });
  };

  return (
    <div className="iblock" id="connect-instruction">
      <div className="iblock-intro">
        <h3 className="wz-box-title">
          <span className="wz-box-step">2</span>
          {t("title")}
        </h3>
        <p>{t("intro")}</p>
      </div>
      <div className="iblock-scope">
        <label htmlFor="connect-scope">{t("scopeLabel")}</label>
        <div className="select-wrap">
          <select
            id="connect-scope"
            className="mono"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {pinnable.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.slug}
                {s.kind === "global" ? t("scopeOrgSuffix") : ""}
              </option>
            ))}
          </select>
          <Icon name="chevDown" />
        </div>
      </div>

      {/* Path A — the normal case */}
      <div className="iblock-step">
        <div className="ib-step-head">
          <span className="ib-step-tag">{t("pathATag")}</span>
          <span className="ib-step-title">{t("pathATitle")}</span>
        </div>
        <p className="ib-step-lead">{t("pathALead")}</p>
        <div className="iblock-out">
          <pre className="iblock-code">
            <code>{block}</code>
          </pre>
          <button
            className="iblock-copy"
            onClick={copyBlock}
            aria-label={t("copyBlock")}
            title={t("copyBlock")}
            type="button"
          >
            <Icon name="copy" />
          </button>
        </div>
      </div>

      {/* Path B — subordinate convenience alternative */}
      <div className="iblock-step subordinate">
        <div className="ib-step-head">
          <span className="ib-step-tag">{t("pathBTag")}</span>
          <span className="ib-step-title">{t("pathBTitle")}</span>
        </div>
        <p className="ib-step-lead">{t("pathBLead")}</p>
        <div className="iblock-out small">
          <pre className="iblock-code">
            <code>{oneOff}</code>
          </pre>
          <button
            className="iblock-copy"
            onClick={copyOneOff}
            aria-label={t("copySentence")}
            title={t("copySentence")}
            type="button"
          >
            <Icon name="copy" />
          </button>
        </div>
      </div>
    </div>
  );
}
