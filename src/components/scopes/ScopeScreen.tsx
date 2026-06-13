"use client";

import { useState } from "react";
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
}: Readonly<{
  scopes: ScopeView[];
  activeSlug: string;
  scope: ScopeView;
  entries: EntryView[];
  members: Record<string, string>;
  syncError?: boolean;
  callerMuted?: boolean;
}>) {
  const [paneOpen, setPaneOpen] = useState(false);
  return (
    <div className="scope-screen">
      <button
        className="scope-pane-toggle"
        type="button"
        onClick={() => setPaneOpen(true)}
        aria-label="Browse scopes"
      >
        <Icon name="layers" />
        <span>Scopes</span>
      </button>
      {paneOpen ? (
        <button
          className="scope-pane-backdrop"
          aria-label="Close scope browser"
          onClick={() => setPaneOpen(false)}
        />
      ) : null}
      <ScopesPane
        scopes={scopes}
        activeSlug={activeSlug}
        mobileOpen={paneOpen}
        onClose={() => setPaneOpen(false)}
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
