"use client";

import { useLocale } from "next-intl";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import type { AgentNotice as AgentNoticeData } from "@/connect/notices";

/**
 * The notice panel for an agent with a verified refusal: rendered in the
 * cell shell's place — no apparatus tabs, no guide, a plain statement of
 * what we measured. Purely data-driven from the manifest entry; this
 * component knows no agent names.
 */
export function AgentNotice({ notice }: Readonly<{ notice: AgentNoticeData }>) {
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const text = notice[locale];
  return (
    <div className="agent-notice">
      <p className="an-intro">{text.intro}</p>
      {text.paras.map((p) => (
        <p className="an-para" key={p.lead}>
          <b>{p.lead}</b> {p.body}
        </p>
      ))}
      <p className="an-foot">{text.footer}</p>
    </div>
  );
}
