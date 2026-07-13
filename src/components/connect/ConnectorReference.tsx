"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { CopyValue } from "./CopyValue";
import type { ConnectorView } from "@/lib/api/types";

/**
 * Compact canonical-value reference below the connect area (moved here
 * from the settings page — the value belongs next to the guide that
 * needs it). Collapsed by default: the cell's copy boxes already carry
 * it; this is for "I need it again without walking the guide".
 *
 * The connector onboards by endpoint URL alone — the client identifies
 * itself at first authorization. So this reference is exactly one value:
 * the endpoint. No client id, no secret, nothing to rotate.
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
      </div>
    </details>
  );
}
