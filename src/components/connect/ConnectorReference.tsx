"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { CopyValue } from "./CopyValue";
import type { ConnectorView } from "@/lib/api/types";

const richB = (chunks: ReactNode) => <b>{chunks}</b>;
const richIdp = (chunks: ReactNode) => <span className="idp-name">{chunks}</span>;

/**
 * Compact canonical-values reference below the connect area (moved here
 * from the settings page — the values belong next to the guide that
 * needs them). Collapsed by default: the cell's copy boxes already carry
 * the values; this is for "I need them again without walking the guide".
 *
 * No rotate button and no secret field: the connector is a public client
 * (PKCE) — there is no secret to rotate.
 */
export function ConnectorReference({ connector }: Readonly<{ connector: ConnectorView }>) {
  const t = useTranslations("connect.reference");
  return (
    <details className="conn-ref">
      <summary>
        <span className="cr-sum">
          <Icon name="link" />
          {t("summary")}
        </span>
        <span className="cr-hint">{t("hint")}</span>
        <Icon name="chevDown" className="cr-chev" />
      </summary>
      <div className="cr-body">
        <div className="cr-row">
          <span className="cr-label">{t("endpoint")}</span>
          <CopyValue value={connector.mcpUrl} />
        </div>
        <div className="cr-row">
          <span className="cr-label">{t("clientId")}</span>
          <CopyValue value={connector.clientId} />
        </div>
        <div className="cr-note">
          <Icon name="info" />
          <span>{t.rich("note", { idp: richIdp, b: richB, idpName: connector.idpName })}</span>
        </div>
      </div>
    </details>
  );
}
