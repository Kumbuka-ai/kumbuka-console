"use client";

import type { ReactNode } from "react";
import { Icon } from "../primitives/Icon";

/**
 * NoContentMarker — the recurring trust-surface that makes the
 * "structurally cannot read memory content" guarantee **visible**.
 *
 * Recurs in four places per the ops-console design handoff §4
 * (Tenant directory, Scope inventory, the private container as a
 * line item, Member support). Also serves as the team console's
 * `PrivatePanel` — the team-facing private-memory reassurance.
 *
 * Dashed border, locked/ok icon, calm copy, "guaranteed by design"
 * status tag in the bottom-right. Never marketing-loud — it's the
 * reading of a structural fact (DB-grant-level for ops, scope-isolation
 * for team).
 */
export function NoContentMarker({
  eyebrow,
  title,
  body,
  status = "guaranteed by design",
  variant = "info",
}: Readonly<{
  eyebrow?: string;
  title: string;
  body: ReactNode;
  /** Trailing status tag in the bottom-right; defaults to the canonical "guaranteed by design". */
  status?: ReactNode;
  /** "info" (default) or "private" (recurs in the team-console PrivatePanel). */
  variant?: "info" | "private";
}>) {
  return (
    <div className={`nocontent${variant === "private" ? " nocontent-private" : ""}`} role="note">
      <div className="nocontent-head">
        <div className="nocontent-icon" aria-hidden>
          <Icon name="lock" />
        </div>
        <div>
          {eyebrow ? <div className="nocontent-eyebrow">{eyebrow}</div> : null}
          <div className="nocontent-title">{title}</div>
        </div>
      </div>
      <div className="nocontent-body">{body}</div>
      {status ? (
        <div className="nocontent-foot">
          <Icon name="ok" />
          {status}
        </div>
      ) : null}
    </div>
  );
}
