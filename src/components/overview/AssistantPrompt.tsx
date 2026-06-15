"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

/**
 * A ready-to-paste set of project instructions the user drops into their Claude
 * or ChatGPT project so the assistant uses kumbuka from the first turn. Kept
 * client-agnostic (works for any MCP-capable assistant) and aligned with the
 * actual tool surface (memory_load_context / memory_recall / memory_remember).
 * The prompt text itself is localized (overview.assistant.prompt); the MCP tool
 * and entry-type identifiers stay in English on purpose.
 */
export function AssistantPrompt() {
  const toast = useToast();
  const t = useTranslations("overview.assistant");
  const tc = useTranslations("common");
  const prompt = t("prompt");
  const copy = async () => {
    await navigator.clipboard?.writeText(prompt);
    toast.push({ message: t("copied") });
  };

  return (
    <div className="assistant-prompt">
      <div className="ap-head">
        <div className="ap-intro">
          <span className="eyebrow">{"// "}{t("eyebrow")}</span>
          <h3>{t("title")}</h3>
          <p className="ap-lead">{t.rich("lead", { b: (c) => <b>{c}</b> })}</p>
        </div>
        <button className="ap-copy" onClick={copy} type="button">
          <Icon name="copy" />
          {tc("copy")}
        </button>
      </div>
      <pre className="ap-prompt">
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
