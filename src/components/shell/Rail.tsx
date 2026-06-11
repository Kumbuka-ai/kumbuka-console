import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import type { ScopeView, SessionView, UserView } from "@/lib/api/types";

const NAV: { id: string; label: string; icon: IconName; href: string }[] = [
  { id: "overview", label: "Overview", icon: "grid", href: "/overview" },
  { id: "scopes", label: "Scopes", icon: "layers", href: "/scopes" },
  { id: "team", label: "Team", icon: "users", href: "/team" },
  { id: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

export function Rail({
  activeId,
  session,
  scopes,
  users,
}: Readonly<{
  activeId: string;
  session: SessionView;
  scopes: ScopeView[];
  users: UserView[];
}>) {
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
          let count: number | null = null;
          if (n.id === "scopes") count = totalEntries;
          else if (n.id === "team") count = users.length;
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={n.icon} />
              <span className="txt">{n.label}</span>
              {count !== null ? <span className="nav-count">{count}</span> : null}
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
