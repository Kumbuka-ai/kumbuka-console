"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ScopesPane } from "./ScopesPane";
import { EntriesView } from "./EntriesView";
import { Icon } from "@/components/ui/Icon";
import type { EntryView, ScopeView } from "@/lib/api/types";

/**
 * Two-pane scope browser. On wide viewports the scope list (ScopesPane) sits
 * beside the entries. On narrow viewports the list is hidden by CSS and opened
 * as an overlay via the "Scopes" toggle — without this, the scope browser was
 * unreachable on mobile (the .mobile-open style existed but nothing set it).
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
}>) {
  const [paneOpen, setPaneOpen] = useState(false);
  const t = useTranslations("scopes");
  return (
    <div className="scope-screen">
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
        canCreateScopes={canCreateScopes}
        isAdmin={isAdmin}
      />
      <EntriesView
        scope={scope}
        entries={entries}
        members={members}
        syncError={syncError}
        callerMuted={callerMuted}
      />
    </div>
  );
}
