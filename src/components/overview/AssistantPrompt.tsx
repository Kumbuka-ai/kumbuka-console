"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { ScopeView } from "@/lib/api/types";

// Module-scope so it isn't flagged as a component defined during render.
const richB = (chunks: ReactNode) => <b>{chunks}</b>;

/**
 * A thin, per-scope copy-paste prompt block (D-GTM-6 B). The user picks which
 * scope the block targets; its slug is pinned LITERALLY into the copied text
 * (Sprint-19 hard rule: a literal slug resolves reliably even on small models,
 * a derived "equals the project name" reference does not). The block carries
 * only the load_context trigger + a one-line Torwächter guard — the full rule
 * set lives server-side in the convention.how-to-kumbuka seeds and arrives via
 * load_context. Stays client-agnostic; the MCP tool name stays English.
 */
export function AssistantPrompt({ scopes }: Readonly<{ scopes: ScopeView[] }>) {
  const toast = useToast();
  const t = useTranslations("overview.assistant");
  const tc = useTranslations("common");

  // Pin targets: the live (non-archived) shared scopes the admin API returns —
  // the global baseline + every project. Private is never in this list.
  const pinnable = scopes.filter((s) => !s.archived);
  const [slug, setSlug] = useState<string>(
    () => pinnable.find((s) => s.kind === "project")?.slug ?? pinnable[0]?.slug ?? "global",
  );

  // The literal slug is interpolated into the SAME string that is displayed and
  // copied, so the two can never drift.
  const prompt = t("prompt", { slug });
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
          <p className="ap-lead">{t.rich("lead", { b: richB })}</p>
        </div>
        <div className="ap-actions">
          {pinnable.length > 1 && (
            <label className="ap-scope">
              <span className="ap-scope-label">{t("scopeLabel")}</span>
              <div className="select-wrap">
                <select
                  className="mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  aria-label={t("scopeLabel")}
                >
                  {pinnable.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.slug}
                    </option>
                  ))}
                </select>
                <Icon name="chevDown" />
              </div>
            </label>
          )}
          <button className="ap-copy" onClick={copy} type="button">
            <Icon name="copy" />
            {tc("copy")}
          </button>
        </div>
      </div>
      <pre className="ap-prompt">
        <code>{prompt}</code>
      </pre>
    </div>
  );
}
