"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setUiSettingsAction } from "@/app/(app)/actions";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { SetupGuide } from "@/components/onboarding/SetupGuide";
import { useToast } from "@/components/ui/Toast";
// Overridable specifier (see docs/extension-points.md): a downstream build
// rebinds it to contribute nav items; by default it returns [] and the
// rail is unchanged.
import { getNavExtensions } from "@kumbuka-ai/console/slots";
import type { ReactNode } from "react";
import type { ScopeView, SessionView } from "@/lib/api/types";

// `id` doubles as the nav.* message key (overview/scopes/team/settings/help).
const NAV: {
  id: "overview" | "scopes" | "team" | "settings" | "help";
  icon: IconName;
  href: string;
}[] = [
  { id: "overview", icon: "grid", href: "/overview" },
  { id: "scopes", icon: "layers", href: "/scopes" },
  { id: "team", icon: "users", href: "/team" },
  { id: "settings", icon: "settings", href: "/settings" },
  { id: "help", icon: "help", href: "/help" },
];

const ACTIVE_ROUTES: { prefix: string; id: string }[] = [
  { prefix: "/overview", id: "overview" },
  { prefix: "/scopes", id: "scopes" },
  { prefix: "/team", id: "team" },
  { prefix: "/settings", id: "settings" },
  { prefix: "/help", id: "help" },
  { prefix: "/account", id: "account" },
];

export function Rail({
  session,
  scopes,
  memberCount,
}: Readonly<{
  session: SessionView;
  scopes: ScopeView[];
  /** Team size for the nav badge. Sourced from the member-safe directory
   *  (not the admin-only roster) so the rail renders for members too. */
  memberCount: number;
}>) {
  // Active route is derived client-side from the live pathname. (A server
  // layout cannot read the current path reliably — the old x-invoke-path /
  // x-url headers are no longer set, so the highlight was stuck on Overview.)
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const pathname = usePathname() ?? "";
  // Collapse state: seeded from the session (SSR — no load flicker),
  // persisted per user (user_account.settings.navCollapsed). Client
  // navigation keeps this component mounted, so the choice survives page
  // changes; a full reload reads the persisted value. Never localStorage.
  const [collapsed, setCollapsed] = useState(session.settings?.navCollapsed ?? false);
  const toggleCollapsed = () => {
    const next = !collapsed;
    // Optimistic: render the click immediately, save in the background.
    setCollapsed(next);
    void setUiSettingsAction({ navCollapsed: next }).then(({ ok }) => {
      // Failed save: the clicked state stays for this session, but silent
      // failure is forbidden — surface a quiet, non-blocking notice.
      if (!ok) toast.push({ message: tCommon("viewSaveFailed") });
    });
  };
  const activeId = ACTIVE_ROUTES.find((r) => pathname.startsWith(r.prefix))?.id ?? "overview";
  const totalEntries = scopes.reduce((n, s) => n + s.entryCount, 0);
  // RBAC: the team tab is admin-only (the route + its endpoints enforce this
  // server-side; this just hides the dead link for plain members).
  const nav = session.role === "admin" ? NAV : NAV.filter((n) => n.id !== "team");
  // Contributed nav items render after the app's own set. Empty by
  // default: nothing is appended — no placeholder, no badge.
  const navExtensions = getNavExtensions("rail");
  // Own-identity chrome (D-CORE-12): show the human display name. Never the raw
  // Keycloak sub (a UUID) and never the email — fall back to a short, non-PII
  // id slug when the session carries no name.
  const displayName = session.displayName?.trim() || null;
  const shortId = session.subject ? `${session.subject.slice(0, 6)}…` : "—";
  const label = displayName ?? shortId;
  const initials = initialsOf(label);
  const firstName = label.split(/[\s@]/)[0] || label;
  return (
    <nav className={`rail${collapsed ? " is-collapsed" : ""}`} aria-label="Primary">
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
        {nav.map((n) => {
          const active = activeId === n.id;
          let countNode: ReactNode = null;
          if (n.id === "scopes") countNode = <span className="nav-count">{totalEntries}</span>;
          else if (n.id === "team") countNode = <span className="nav-count">{memberCount}</span>;
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
        {navExtensions.map((x) => {
          const active = pathname.startsWith(x.href);
          return (
            <Link
              key={x.id}
              href={x.href}
              className={`nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={x.icon} />
              <span className="txt">{x.label[locale]}</span>
            </Link>
          );
        })}
      </div>

      <div className="rail-foot">
        <SetupGuide />
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
        {/* Icon-only on purpose (the « / » affordance); the accessible name
            and the tooltip carry the label. */}
        <button
          className="rail-collapse"
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("expandNav") : t("collapseNav")}
          title={collapsed ? t("expandNav") : t("collapseNav")}
        >
          <Icon name={collapsed ? "chevsRight" : "chevsLeft"} />
        </button>
      </div>
    </nav>
  );
}
