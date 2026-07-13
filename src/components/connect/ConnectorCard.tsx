"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { CopyValue } from "./CopyValue";
import type { ConnectorView } from "@/lib/api/types";

const richB = (chunks: ReactNode) => <b>{chunks}</b>;
const richMono = (chunks: ReactNode) => (
  <span className="mono" style={{ color: "var(--c-ink-panel-text)" }}>{chunks}</span>
);

/**
 * The agent-agnostic connector card — endpoint, client id, "no secret —
 * public client, PKCE", plus the generic three-step outline. This is the
 * connect area's fallback whenever no cell is verified for any agent:
 * exactly the surface the console carried before the guided cells
 * existed, not a placeholder. It is permanent code — it stays the state
 * for every user whose client has no verified cell.
 */
export function ConnectorCard({ connector }: Readonly<{ connector: ConnectorView }>) {
  const t = useTranslations("connect.fallback");
  return (
    <div className="connector">
      <div className="conn-main">
        <span className="eyebrow">{"// "}{t("eyebrow")}</span>
        <h3>{t("title")}</h3>
        <p className="conn-lead">{t("lead")}</p>
        <div className="conn-field">
          <label>{t("endpoint")}</label>
          <CopyValue value={connector.mcpUrl} />
        </div>
        <div className="conn-field">
          <label>{t("clientId")}</label>
          <CopyValue value={connector.clientId} />
        </div>
        <div className="conn-field">
          <label>{t("clientSecret")}</label>
          {connector.clientSecretMasked ? (
            <CopyValue value={connector.clientSecretMasked} masked />
          ) : (
            <span className="conn-nosecret">{t("noSecret")}</span>
          )}
        </div>
      </div>
      <div className="vr" />
      <div className="conn-side">
        <div className="cs-title">
          <Icon name="ok" />
          {t("reachTitle")}
        </div>
        <p>{t.rich("reachBody", { b: richB, code: richMono })}</p>
        <ol className="cs-steps">
          <li>{t("step1")}</li>
          <li>{connector.clientSecretMasked ? t("step2Secret") : t("step2Public")}</li>
          <li>{t.rich("step3", { code: richMono })}</li>
        </ol>
      </div>
    </div>
  );
}
