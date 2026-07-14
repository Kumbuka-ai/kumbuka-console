"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { setUiSettingsAction } from "@/app/(app)/actions";
import { ScopesPane } from "./ScopesPane";
import { EntriesView } from "./EntriesView";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { EntryView, ScopeView } from "@/lib/api/types";

/**
 * Two-pane scope browser. On wide viewports the scope list (ScopesPane) sits
 * beside the entries. On narrow viewports the list is hidden by CSS and opened
 * as an overlay via the "Scopes" toggle — without this, the scope browser was
 * unreachable on mobile (the .mobile-open style existed but nothing set it).
 *
 * On wide viewports the list is also collapsible, persisted per user
 * (`user_account.settings.scopesCollapsed`, arriving via the session — same
 * contract as the rail: optimistic toggle, quiet non-blocking notice on a
 * failed save, never localStorage). Collapsed, the pane narrows to an icon
 * rail (like the navigation) with the expand chevron in its bottom strip —
 * the affordance back never disappears. The narrow-viewport overlay
 * behaviour is untouched (the collapse styles are media-scoped to wide
 * viewports).
 */
export function ScopeScreen({
  scopes,
  activeSlug,
  scope,
  entries,
  members,
  syncError,
  callerMuted,
  canCreateScopes = true,
  isAdmin = false,
  initialCollapsed = false,
}: Readonly<{
  scopes: ScopeView[];
  activeSlug: string;
  scope: ScopeView;
  entries: EntryView[];
  members: Record<string, string>;
  syncError?: boolean;
  callerMuted?: boolean;
  canCreateScopes?: boolean;
  isAdmin?: boolean;
  /** Persisted list-collapse state from the session (SSR — no load flicker). */
  initialCollapsed?: boolean;
}>) {
  const [paneOpen, setPaneOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const t = useTranslations("scopes");
  const tCommon = useTranslations("common");
  const toast = useToast();

  const toggleCollapsed = () => {
    const next = !collapsed;
    // Optimistic: render the click immediately, save in the background.
    setCollapsed(next);
    void setUiSettingsAction({ scopesCollapsed: next }).then(({ ok }) => {
      // Failed save: the clicked state stays for this session, but silent
      // failure is forbidden — surface a quiet, non-blocking notice.
      if (!ok) toast.push({ message: tCommon("viewSaveFailed") });
    });
  };

  return (
    <div className={`scope-screen${collapsed ? " pane-collapsed" : ""}`}>
      <button
        className="scope-pane-toggle"
        type="button"
        onClick={() => setPaneOpen(true)}
        aria-label={t("browseAria")}
      >
        <Icon name="layers" />
        <span>{t("toggle")}</span>
      </button>
      {paneOpen ? (
        <button
          className="scope-pane-backdrop"
          aria-label={t("closeBrowser")}
          onClick={() => setPaneOpen(false)}
        />
      ) : null}
      <ScopesPane
        scopes={scopes}
        activeSlug={activeSlug}
        mobileOpen={paneOpen}
        onClose={() => setPaneOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        canCreateScopes={canCreateScopes}
        isAdmin={isAdmin}
      />
      <EntriesView
        scope={scope}
        scopes={scopes}
        entries={entries}
        members={members}
        syncError={syncError}
        callerMuted={callerMuted}
        isAdmin={isAdmin}
      />
    </div>
  );
}
