"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useMenu } from "@/components/ui/Menu";
import { PrivatePanel } from "./PrivatePanel";
import { ScopeEditor } from "@/components/editors/ScopeEditor";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { archiveScopeAction, unarchiveScopeAction } from "@/app/(app)/actions";
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
  const t = useTranslations("scopes");
  return (
    <a
      key={scope.slug}
      href={`/scopes/${scope.slug}`}
      className={`scope-item${active ? " active" : ""}${scope.archived ? " archived" : ""}`}
      title={`${scope.slug} · ${scope.name}`}
    >
      <ScopeIcon scope={scope} />
      <span className="scope-text">
        <span className="scope-id">{scope.slug}</span>
        <span className="sub">{scope.name}</span>
      </span>
      <span className="scope-meta">
        {scope.fixed ? <span className="scope-flag">{t("fixed")}</span> : null}
        {scope.syncError ? (
          <span
            className="scope-flag"
            style={{
              color: "var(--type-constraint)",
              borderColor: "var(--type-constraint)",
            }}
          >
            {t("sync")}
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
            aria-label={t("rowActionsAria", { slug: scope.slug })}
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
  collapsed = false,
  onToggleCollapse,
  canCreateScopes = true,
  isAdmin = false,
}: Readonly<{
  scopes: ScopeView[];
  activeSlug: string;
  /** On narrow viewports the pane is an overlay toggled open by the parent. */
  mobileOpen?: boolean;
  onClose?: () => void;
  /** Wide-viewport collapse state (persisted by the parent): the pane
   *  narrows to an icon rail; the bottom strip's chevron toggles it. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Scope lifecycle (rename / archive / un-archive) is a team-admin governance
   *  op (finding dogfood-16). Members don't see those menu items; the backend
   *  enforces it regardless (@RolesAllowed("admin")). */
  isAdmin?: boolean;
  /**
   * Whether the caller may create scopes (admin, or member when the tenant's
   * createScopes setting allows it). Hides the "+" affordance otherwise — the
   * backend enforces this regardless, so this is purely about not offering an
   * action that would fail.
   */
  canCreateScopes?: boolean;
}>) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ScopeView | null>(null);
  const [archiving, setArchiving] = useState<ScopeView | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const menu = useMenu();
  const t = useTranslations("scopes");

  const projects = scopes.filter((s) => s.kind === "project" && !s.archived);
  const archived = scopes.filter((s) => s.archived);
  const globalScope = scopes.find((s) => s.kind === "global");

  const openMenu = (e: MouseEvent, s: ScopeView) => {
    const copyId = {
      label: t("menu.copyId"),
      icon: "copy" as const,
      onSelect: async () => {
        await navigator.clipboard?.writeText(s.slug);
        toast.push({ message: t("toast.idCopied") });
      },
    };
    // dogfood-16: restore wired to the server :unarchive endpoint (SPRINT_21.S2).
    // Until that endpoint deploys the call returns a typed failure → readable
    // toast, never a crash.
    const lifecycle = s.archived
      ? { label: t("menu.restore"), icon: "rotate" as const, onSelect: () => doRestore(s) }
      : { label: t("menu.archive"), icon: "archive" as const, danger: true, onSelect: () => setArchiving(s) };
    // Rename + archive/restore are team-admin governance ops (dogfood-16);
    // members only get the harmless copy-id.
    const items: Parameters<typeof menu.open>[1] = isAdmin
      ? [{ label: t("menu.rename"), icon: "edit", onSelect: () => setRenaming(s) }, copyId, { kind: "sep" }, lifecycle]
      : [copyId];
    menu.open(e, items);
  };

  const doArchive = () => {
    if (!archiving) return;
    start(async () => {
      const res = await archiveScopeAction(archiving.slug).catch(() => ({ ok: false as const }));
      if (!res.ok) {
        toast.push({ message: t("toast.archiveFailed") });
        return;
      }
      toast.push({ message: t("toast.archived", { slug: archiving.slug }) });
      setArchiving(null);
      router.push("/scopes");
    });
  };

  const doRestore = (s: ScopeView) => {
    start(async () => {
      const res = await unarchiveScopeAction(s.slug).catch(() => ({ ok: false as const }));
      toast.push({
        message: res.ok ? t("toast.restored", { slug: s.slug }) : t("toast.restoreFailed"),
      });
    });
  };

  return (
    <>
      <aside className={`scopes-pane${mobileOpen ? " mobile-open" : ""}`}>
        <div className="pane-head">
          <span className="eyebrow">{"// "}{t("paneEyebrow")}</span>
          {onClose ? (
            <button
              className="pane-close"
              onClick={onClose}
              aria-label={t("closeBrowser")}
              type="button"
            >
              <Icon name="x" />
            </button>
          ) : null}
          {canCreateScopes ? (
            <button
              className="addscope"
              onClick={() => setCreating(true)}
              aria-label={t("newScope")}
              title={t("newScope")}
              type="button"
            >
              <Icon name="plus" />
            </button>
          ) : null}
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
          <span>{t("projects")}</span>
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
              <span>{t("archived")}</span>
              <span>{archived.length}</span>
            </div>
            <div className="scope-list" style={{ paddingBottom: 24 }}>
              {archived.map((s) => (
                <ScopeItem key={s.slug} scope={s} active={s.slug === activeSlug} onOpenMenu={openMenu} />
              ))}
            </div>
          </>
        ) : null}

        {/* Bottom of the pane, sticky so a long list never hides it — sits on
            the same line as the rail's collapse chevron. Icon-only, like the
            rail's; toggles both ways. */}
        {onToggleCollapse ? (
          <button
            className="pane-collapse"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("expandPane") : t("collapsePane")}
            title={collapsed ? t("expandPane") : t("collapsePane")}
            type="button"
          >
            <Icon name={collapsed ? "chevsRight" : "chevsLeft"} />
          </button>
        ) : null}
      </aside>

      {creating ? (
        <ScopeEditor
          scope={null}
          existingSlugs={scopes.map((s) => s.slug)}
          onClose={() => setCreating(false)}
        />
      ) : null}
      {renaming ? <ScopeEditor scope={renaming} onClose={() => setRenaming(null)} /> : null}
      {menu.node}
      {archiving ? (
        <ConfirmModal
          eyebrow={t("archiveConfirm.eyebrow")}
          title={t("archiveConfirm.title", { slug: archiving.slug })}
          body={t("archiveConfirm.body", { count: archiving.entryCount })}
          target={archiving.slug}
          confirmLabel={pending ? t("archiveConfirm.working") : t("archiveConfirm.confirm")}
          confirmIcon="archive"
          danger
          onCancel={() => setArchiving(null)}
          onConfirm={doArchive}
        />
      ) : null}
    </>
  );
}
