"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useMenu } from "@/components/ui/Menu";
import { PrivatePanel } from "./PrivatePanel";
import { ScopeEditor } from "@/components/editors/ScopeEditor";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { archiveScopeAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/Toast";
import type { ScopeView } from "@/lib/api/types";

function ScopeIcon({ scope }: Readonly<{ scope: ScopeView }>) {
  if (scope.kind === "global") return <Icon name="globe" />;
  if (scope.archived) return <Icon name="archive" />;
  return <Icon name="folder" />;
}

function ScopeItem({
  scope,
  active,
  onOpenMenu,
}: Readonly<{
  scope: ScopeView;
  active: boolean;
  onOpenMenu?: (e: MouseEvent, s: ScopeView) => void;
}>) {
  return (
    <a
      key={scope.slug}
      href={`/scopes/${scope.slug}`}
      className={`scope-item${active ? " active" : ""}${scope.archived ? " archived" : ""}`}
    >
      <ScopeIcon scope={scope} />
      <span style={{ minWidth: 0 }}>
        <span className="scope-id">{scope.slug}</span>
        <span className="sub">{scope.name}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {scope.fixed ? <span className="scope-flag">fixed</span> : null}
        {scope.syncError ? (
          <span
            className="scope-flag"
            style={{
              color: "var(--type-constraint)",
              borderColor: "var(--type-constraint)",
            }}
          >
            sync
          </span>
        ) : null}
        <span className="scope-count">{scope.entryCount}</span>
        {!scope.fixed && onOpenMenu ? (
          <button
            className="row-menu-btn"
            style={{ opacity: 1, width: 22, height: 22 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenMenu(e, scope);
            }}
            aria-label={`Actions for scope ${scope.slug}`}
            type="button"
          >
            <Icon name="more" />
          </button>
        ) : null}
      </span>
    </a>
  );
}

export function ScopesPane({
  scopes,
  activeSlug,
  mobileOpen = false,
  onClose,
}: Readonly<{
  scopes: ScopeView[];
  activeSlug: string;
  /** On narrow viewports the pane is an overlay toggled open by the parent. */
  mobileOpen?: boolean;
  onClose?: () => void;
}>) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ScopeView | null>(null);
  const [archiving, setArchiving] = useState<ScopeView | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const menu = useMenu();

  const projects = scopes.filter((s) => s.kind === "project" && !s.archived);
  const archived = scopes.filter((s) => s.archived);
  const globalScope = scopes.find((s) => s.kind === "global");

  const openMenu = (e: MouseEvent, s: ScopeView) =>
    menu.open(e, [
      { label: "Rename", icon: "edit", onSelect: () => setRenaming(s) },
      {
        label: "Copy scope id",
        icon: "copy",
        onSelect: async () => {
          await navigator.clipboard?.writeText(s.slug);
          toast.push({ message: "Scope id copied" });
        },
      },
      { kind: "sep" },
      s.archived
        ? {
            label: "Restore",
            icon: "rotate",
            onSelect: () => toast.push({ message: "Restore not implemented in this build" }),
          }
        : {
            label: "Archive",
            icon: "archive",
            danger: true,
            onSelect: () => setArchiving(s),
          },
    ]);

  const doArchive = () => {
    if (!archiving) return;
    start(async () => {
      try {
        await archiveScopeAction(archiving.slug);
        toast.push({ message: `Scope ${archiving.slug} archived` });
        setArchiving(null);
        router.push("/scopes");
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Archive failed" });
      }
    });
  };

  return (
    <>
      <aside className={`scopes-pane${mobileOpen ? " mobile-open" : ""}`}>
        <div className="pane-head">
          <span className="eyebrow">{"// "}scopes</span>
          {onClose ? (
            <button
              className="pane-close"
              onClick={onClose}
              aria-label="Close scope browser"
              type="button"
            >
              <Icon name="x" />
            </button>
          ) : null}
          <button
            className="addscope"
            onClick={() => setCreating(true)}
            aria-label="New scope"
            title="New scope"
            type="button"
          >
            <Icon name="plus" />
          </button>
        </div>

        <div className="scope-list">
          {globalScope ? (
            <ScopeItem
              scope={globalScope}
              active={globalScope.slug === activeSlug}
              onOpenMenu={undefined}
            />
          ) : null}
        </div>

        <div className="scope-group-label">
          <span>Project scopes</span>
          <span>{projects.length}</span>
        </div>
        <div className="scope-list">
          {projects.map((s) => (
            <ScopeItem key={s.slug} scope={s} active={s.slug === activeSlug} onOpenMenu={openMenu} />
          ))}
        </div>

        <PrivatePanel />

        {archived.length > 0 ? (
          <>
            <div className="scope-group-label">
              <span>Archived</span>
              <span>{archived.length}</span>
            </div>
            <div className="scope-list" style={{ paddingBottom: 24 }}>
              {archived.map((s) => (
                <ScopeItem key={s.slug} scope={s} active={s.slug === activeSlug} onOpenMenu={openMenu} />
              ))}
            </div>
          </>
        ) : null}
      </aside>

      {creating ? <ScopeEditor scope={null} onClose={() => setCreating(false)} /> : null}
      {renaming ? <ScopeEditor scope={renaming} onClose={() => setRenaming(null)} /> : null}
      {menu.node}
      {archiving ? (
        <ConfirmModal
          eyebrow="archive scope"
          title={`Archive ${archiving.slug}?`}
          body={`The scope and its ${archiving.entryCount} entries become read-only. The assistant stops writing to it. You can restore it later.`}
          target={archiving.slug}
          confirmLabel={pending ? "Archiving…" : "Archive"}
          confirmIcon="archive"
          danger
          onCancel={() => setArchiving(null)}
          onConfirm={doArchive}
        />
      ) : null}
    </>
  );
}
