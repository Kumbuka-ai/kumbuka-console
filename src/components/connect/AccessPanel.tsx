"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import type { ScopeView } from "@/lib/api/types";

const richB = (chunks: ReactNode) => <b>{chunks}</b>;

/**
 * The access-guarantee panel — one of the five private-guarantee
 * surfaces. Left: the shared scopes the connector can reach, as chips.
 * Right, on deep ink: the guarantee — private memory is STRUCTURALLY
 * unreachable through the console, the admin API, and this connector
 * (the code paths do not exist). Deliberately not "the operator cannot
 * read it": the difference is the entire product statement.
 */
export function AccessPanel({ scopes }: Readonly<{ scopes: ScopeView[] }>) {
  const t = useTranslations("connect.access");
  const shared = scopes.filter((s) => !s.archived);
  const projects = shared.filter((s) => s.kind === "project");
  return (
    <div className="access-panel">
      <div className="ap-main">
        <div className="ap-title">
          <Icon name="shield" />
          {t("title")}
        </div>
        <p>{t.rich("body", { count: projects.length, b: richB })}</p>
        <div className="ap-scopes">
          {shared.map((s) => (
            <span className="ap-chip" key={s.slug}>
              <Icon name={s.kind === "global" ? "globe" : "folder"} />
              {s.slug}
            </span>
          ))}
        </div>
      </div>
      <div className="ap-guarantee">
        <div className="ap-lock">
          <Icon name="lock" />
        </div>
        <p>{t.rich("guarantee", { b: richB })}</p>
        <div className="ap-foot">
          <Icon name="shield" />
          {t("foot")}
        </div>
      </div>
    </div>
  );
}
