"use client";

import type { ReactNode } from "react";

/**
 * Parametrisable navigation rail.
 *
 * Used by both the team console (deep-ink rail + "memory console"
 * sub-label) and the commercial ops console (navy rail + "OPS ·
 * CONTROL PLANE" badge + active-tenant pin in the topbar).
 *
 * The mode signal is **chrome-only** per the ops-console design
 * handoff §1: change the rail's CSS variable, swap the brand block,
 * pin a context. Nothing about the content surfaces changes.
 *
 * Consumers pass:
 *   - `brand`     — the lockup/eyebrow block at the top
 *   - `nav`       — primary navigation items (any markup; consumer owns
 *                   active-state logic against their router)
 *   - `foot`      — bottom block (user chip, account link, …)
 *   - `railColor` — optional override for the rail background; defaults
 *                   to `var(--c-rail)`. The ops console passes
 *                   `var(--navy)` to flip to authority-voice.
 */
export function Rail({
  brand,
  nav,
  foot,
  railColor,
  textOpacity,
}: Readonly<{
  brand: ReactNode;
  nav: ReactNode;
  foot?: ReactNode;
  /** CSS colour expression — e.g. `var(--navy)`. Defaults to `var(--c-rail)`. */
  railColor?: string;
  /** Rail text opacity (e.g. 0.74 on navy, 0.62 on deep-ink). */
  textOpacity?: number;
}>) {
  const style: Record<string, string> = {};
  if (railColor) style["--c-rail"] = railColor;
  if (textOpacity !== undefined) style["--c-rail-text"] =
    `rgba(244,241,234,${textOpacity})`;

  return (
    <nav className="rail" aria-label="Primary" style={style as React.CSSProperties}>
      <div className="brand">{brand}</div>
      <div className="nav">{nav}</div>
      {foot ? <div className="rail-foot">{foot}</div> : null}
    </nav>
  );
}
