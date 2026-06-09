"use client";

import type { ReactNode } from "react";

/**
 * Parametrisable topbar with slots for breadcrumb, context-pin, and
 * trailing actions.
 *
 * The ops console fills `contextPin` with the active-tenant indicator
 * (per design handoff §1) — "you are operating on `acme`" — so the
 * operator can't lose track of which tenant they're touching. The
 * team console leaves it empty.
 */
export function Topbar({
  title,
  meta,
  contextPin,
  trailing,
}: {
  title: string;
  meta?: string;
  /** Optional pinned context — the ops console renders an active-tenant indicator here. */
  contextPin?: ReactNode;
  /** Right-aligned actions (theme toggle, etc.). */
  trailing?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="crumb">
        <h1>{title}</h1>
        {meta ? <span className="crumb-meta">{"// "}{meta}</span> : null}
      </div>
      {contextPin ? <div className="context-pin">{contextPin}</div> : null}
      <span className="topbar-spacer" />
      {trailing}
    </header>
  );
}
