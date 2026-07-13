"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";

/**
 * Block 3 — "So benutzt du kumbuka". Exactly TWO examples, in and out —
 * no type course, no taxonomy (that is the help area's job), and no
 * manual context-load walkthrough (that is Block 2's automation; showing
 * it as handwork here would devalue it).
 *
 * The examples are SENTENCES TO THE ASSISTANT, never tool calls: the
 * copy button copies the sentence. Showing function signatures would
 * teach users that kumbuka is an API with a chat veneer — half the
 * product idea (you talk, the assistant curates, the `ask` policy asks)
 * would be gambled away. The memory type appears as a small RESULT, not
 * as input, and is not explained here.
 */
export function UsageBlock() {
  const t = useTranslations("connect.usage");
  const toast = useToast();
  const say1 = t("say1");
  const say2 = t("say2");
  const copy = async (sentence: string) => {
    await navigator.clipboard?.writeText(sentence);
    toast.push({ message: t("sentenceCopied") });
  };
  return (
    <div className="iblock usage-block">
      <div className="iblock-intro">
        <h3 className="wz-box-title">
          <span className="wz-box-step">3</span>
          {t("title")}
        </h3>
        <p>{t("intro")}</p>
      </div>
      <div className="usage-grid">
        <div className="usage-ex">
          <div className="ux-label">{t("rememberLabel")}</div>
          <div className="ux-say">
            <p className="ux-sentence">„{say1}“</p>
            <button
              className="iblock-copy"
              onClick={() => copy(say1)}
              aria-label={t("copySentence")}
              title={t("copySentence")}
              type="button"
            >
              <Icon name="copy" />
            </button>
          </div>
          <div className="ux-result">
            <span className="ux-result-label">{t("resultLabel")}</span>
            <TypeChip type="decision" boxed />
            <code className="ux-key">db.system-of-record</code>
          </div>
        </div>
        <div className="usage-ex">
          <div className="ux-label">{t("recallLabel")}</div>
          <div className="ux-say">
            <p className="ux-sentence">„{say2}“</p>
            <button
              className="iblock-copy"
              onClick={() => copy(say2)}
              aria-label={t("copySentence")}
              title={t("copySentence")}
              type="button"
            >
              <Icon name="copy" />
            </button>
          </div>
          <Link className="ux-more" href="/help/types#decision">
            {t("more")}
            <span className="mono"> →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
