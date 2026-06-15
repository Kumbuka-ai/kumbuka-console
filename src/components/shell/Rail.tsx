"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import type { ReactNode } from "react";
import type { ScopeView, SessionView, UserView } from "@/lib/api/types";

// `id` doubles as the nav.* message key (overview/scopes/team/settings).
const NAV: { id: "overview" | "scopes" | "team" | "settings"; icon: IconName; href: string }[] = [
  { id: "overview", icon: "grid", href: "/overview" },
  { id: "scopes", icon: "layers", href: "/scopes" },
  { id: "team", icon: "users", href: "/team" },
  { id: "settings", icon: "settings", href: "/settings" },
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
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
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
          <span className="brand-sub">{t("brandSub")}</span>
        </div>
      </div>

      <div className="nav">
        <div className="nav-label">{t("workspace")}</div>
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
              <span className="txt">{t(n.id)}</span>
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
          title={t("accountTitle")}
        >
          <Avatar initials={initials} />
          <div className="u-meta">
            <div className="u-name">
              {firstName}
              <span className="acct-link">{t("accountSuffix")}</span>
            </div>
            <div className="u-role">{tRoles(session.role)} · {t("signedIn")}</div>
          </div>
          <span className="u-chev">
            <Icon name="chevRight" />
          </span>
        </Link>
      </div>
    </nav>
  );
}
