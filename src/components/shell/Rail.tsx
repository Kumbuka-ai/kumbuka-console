"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import type { ReactNode } from "react";
import type { ScopeView, SessionView, UserView } from "@/lib/api/types";

const NAV: { id: string; label: string; icon: IconName; href: string }[] = [
  { id: "overview", label: "Overview", icon: "grid", href: "/overview" },
  { id: "scopes", label: "Scopes", icon: "layers", href: "/scopes" },
  { id: "team", label: "Team", icon: "users", href: "/team" },
  { id: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

const ACTIVE_ROUTES: { prefix: string; id: string }[] = [
  { prefix: "/overview", id: "overview" },
  { prefix: "/scopes", id: "scopes" },
  { prefix: "/team", id: "team" },
  { prefix: "/settings", id: "settings" },
  { prefix: "/account", id: "account" },
];

export function Rail({
  session,
  scopes,
  users,
}: Readonly<{
  session: SessionView;
  scopes: ScopeView[];
  users: UserView[];
}>) {
  // Active route is derived client-side from the live pathname. (A server
  // layout cannot read the current path reliably — the old x-invoke-path /
  // x-url headers are no longer set, so the highlight was stuck on Overview.)
  const pathname = usePathname() ?? "";
  const activeId = ACTIVE_ROUTES.find((r) => pathname.startsWith(r.prefix))?.id ?? "overview";
  const totalEntries = scopes.reduce((n, s) => n + s.entryCount, 0);
  const fallbackName = session.displayName || session.email || session.subject || "—";
  const initials = initialsOf(fallbackName);
  const firstName = fallbackName.split(/[\s@]/)[0] ?? "—";
  return (
    <nav className="rail" aria-label="Primary">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-mark" src="/brand/kumbuka-mark-white.svg" alt="" />
        <div>
          <div className="brand-name">
            kumbuka<span className="dot">.ai</span>
          </div>
          <span className="brand-sub">memory console</span>
        </div>
      </div>

      <div className="nav">
        <div className="nav-label">Workspace</div>
        {NAV.map((n) => {
          const active = activeId === n.id;
          let countNode: ReactNode = null;
          if (n.id === "scopes") countNode = <span className="nav-count">{totalEntries}</span>;
          else if (n.id === "team") countNode = <span className="nav-count">{users.length}</span>;
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={n.icon} />
              <span className="txt">{n.label}</span>
              {countNode}
            </Link>
          );
        })}
      </div>

      <div className="rail-foot">
        <Link
          href="/account"
          className={`user-chip${activeId === "account" ? " active" : ""}`}
          aria-current={activeId === "account" ? "page" : undefined}
          title="Account settings"
        >
          <Avatar initials={initials} />
          <div className="u-meta">
            <div className="u-name">
              {firstName}
              <span className="acct-link">(account)</span>
            </div>
            <div className="u-role">{session.role} · signed in</div>
          </div>
          <span className="u-chev">
            <Icon name="chevRight" />
          </span>
        </Link>
      </div>
    </nav>
  );
}
