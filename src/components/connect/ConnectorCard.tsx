"use client";

import { useTranslations } from "next-intl";
import { CopyValue } from "./CopyValue";
import type { ConnectorView } from "@/lib/api/types";

/**
 * The agent-agnostic connector card — the connect area's fallback
 * whenever no cell is verified for any agent. It is permanent code: it
 * stays the surface for every user whose client has no verified cell.
 *
 * The connector onboards by endpoint URL alone: the client identifies
 * itself at first authorization, so the card is exactly the intro and
 * the endpoint copy box. The former client-id field and the masked-
 * secret branch described a dialog that no longer exists; the former
 * right-hand column is gone with them — its "enter the client id, leave
 * the secret empty" step had become wrong, and the access-guarantee
 * panel rendered right below this card is the stronger, correct
 * statement of what the connector can reach.
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
      </div>
    </div>
  );
}
