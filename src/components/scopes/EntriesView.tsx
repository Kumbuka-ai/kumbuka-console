"use client";

import { useMemo, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { TypeChip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState } from "@/components/ui/State";
import { EntryEditor } from "@/components/editors/EntryEditor";
import { MoveScopeDialog } from "@/components/editors/MoveScopeDialog";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { ScopeLock } from "./ScopeLock";
import { deleteEntryAction } from "@/app/(app)/actions";
import { entryWriteErrorMessage } from "@/lib/entryWriteError";
import { relTime, absTime } from "@/lib/time";
import {
  ENTRY_TYPE_ORDER,
  SYSTEM_SUBJECT,
  type EntryType,
  type EntryView,
  type ScopeView,
} from "@/lib/api/types";

// Module-scope rich-text renderer (not defined during render).
const richB = (c: ReactNode) => <b>{c}</b>;

type SortCol = "type" | "key" | "author" | "updated";
type Sort = { col: SortCol; dir: "asc" | "desc" };

/**
 * Server-derived system identity (D-CORE-11): the author of the protected
 * `how-to-kumbuka` seed mnemonics. These rows are structurally undeletable
 * (DB trigger) — we surface that in the UI (disabled delete) and render the
 * author as "System" instead of the raw sentinel.
 */
const SYSTEM_DISPLAY = "System";

/** True for the protected system-seed entries (cannot be deleted). */
function isSystemEntry(entry: { authorSubject: string }) {
  return entry.authorSubject === SYSTEM_SUBJECT;
}

function authorName(subject: string, members: Map<string, string>) {
  if (subject === SYSTEM_SUBJECT) return SYSTEM_DISPLAY;
  return members.get(subject) ?? subject;
}

export function EntriesView({
  scope,
  scopes = [],
  entries,
  members,
  syncError,
  callerMuted,
  isAdmin = false,
}: Readonly<{
  scope: ScopeView;
  /** All visible (shared) scopes — target candidates for the D-CORE-17 remap. */
  scopes?: ScopeView[];
  entries: EntryView[];
  members: Record<string, string>;
  syncError?: boolean;
  callerMuted?: boolean;
  /** D-CORE-17: scope-remap ("Move to scope") is admin-only. */
  isAdmin?: boolean;
}>) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const t = useTranslations("scopes");
  const tErr = useTranslations("entryError");
  const tTypes = useTranslations("entryTypes");

  const layout = (params.get("layout") as "table" | "cards" | null) ?? "table";
  const density = params.get("density") === "compact";
  const query = params.get("q") ?? "";
  const types = (params.get("types") ?? "")
    .split(",")
    .filter(Boolean) as EntryType[];

  const [editor, setEditor] = useState<{ entry: EntryView | null } | null>(null);
  const [moveTarget, setMoveTarget] = useState<EntryView | null>(null);
  const [confirmDel, setConfirmDel] = useState<EntryView | null>(null);
  const [pending, start] = useTransition();
  const [sort, setSort] = useState<Sort>({ col: "updated", dir: "desc" });

  const memberMap = useMemo(() => new Map(Object.entries(members)), [members]);

  const counts = useMemo(() => {
    const acc: Record<EntryType, number> = {
      decision: 0,
      convention: 0,
      constraint: 0,
      open_question: 0,
      glossary: 0,
      status: 0,
    };
    for (const e of entries) acc[e.type] += 1;
    return acc;
  }, [entries]);

  const rows = useMemo(() => {
    let r = entries.slice();
    if (types.length) r = r.filter((e) => types.includes(e.type));
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (e) =>
          (e.key ?? "").toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          authorName(e.authorSubject, memberMap).toLowerCase().includes(q),
      );
    }
    r.sort((a, b) => {
      let av: string;
      let bv: string;
      if (sort.col === "type") {
        av = a.type;
        bv = b.type;
      } else if (sort.col === "key") {
        av = a.key ?? "~";
        bv = b.key ?? "~";
      } else if (sort.col === "author") {
        av = authorName(a.authorSubject, memberMap);
        bv = authorName(b.authorSubject, memberMap);
      } else {
        av = a.updatedAt;
        bv = b.updatedAt;
      }
      let cmp = 0;
      if (av < bv) cmp = -1;
      else if (av > bv) cmp = 1;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [entries, types, query, sort, memberMap]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const toggleType = (t: EntryType) => {
    const set = new Set(types);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    setParam("types", set.size ? Array.from(set).join(",") : null);
  };

  // Read-only axes (D-CORE-2 mute, archived, FEAT-19 scope-lock) compose here.
  // `baseReadOnly` (archived/muted) is read-only for EVERYONE and not overridable.
  // FEAT-19 / D-CORE-18: a content-locked scope is read-only for MEMBERS only —
  // an admin's console write is a server-audited override, so writes stay enabled
  // for an admin in a locked scope. `lockedForMember` drives the member-only
  // gating (CTA, delete) and the "Edit"→"View" relabel.
  const baseReadOnly = scope.archived || Boolean(callerMuted);
  const lockedForMember = scope.locked && !isAdmin;
  const memberReadOnly = baseReadOnly || lockedForMember;
  // B4: an admin who reaches a delete in a locked scope is performing an audited
  // override (members are delete-blocked before this). Drives the lockWarn dialog.
  const deleteOverride = scope.locked && isAdmin;

  // D-CORE-17: at least one other shared, non-archived scope must exist to move into.
  const hasMoveTargets = scopes.some((s) => s.slug !== scope.slug && !s.archived);

  const openRowMenu = (e: MouseEvent, entry: EntryView) =>
    menu.open(e, [
      {
        // FEAT-19: a member in a locked scope gets a read-only "View" (the editor
        // opens disabled); an admin gets the override "Edit". Archived/muted still
        // disable opening entirely.
        label: lockedForMember ? t("entryMenu.view") : t("entryMenu.edit"),
        icon: lockedForMember ? "eye" : "edit",
        disabled: baseReadOnly,
        onSelect: () => setEditor({ entry }),
      },
      {
        label: t("entryMenu.copyKey"),
        icon: "copy",
        disabled: !entry.key,
        onSelect: async () => {
          if (entry.key) await navigator.clipboard?.writeText(entry.key);
          toast.push({ message: t("toast.keyCopied") });
        },
      },
      // Scope-remap is admin-only (D-CORE-17) and never offered for the protected
      // system seed; hidden entirely for non-admins (the #55 admin-gating pattern).
      // An admin in a locked scope CAN move (server-audited override) — gate on
      // baseReadOnly only, not the lock.
      ...(isAdmin && !isSystemEntry(entry)
        ? [
            {
              label: t("entryMenu.move"),
              icon: "folder",
              disabled: baseReadOnly || !hasMoveTargets,
              onSelect: () => setMoveTarget(entry),
            } as const,
          ]
        : []),
      { kind: "sep" },
      {
        label: t("entryMenu.delete"),
        icon: "trash",
        danger: true,
        // System-seed entries are structurally undeletable (D-CORE-11 DB trigger);
        // a member in a locked scope is delete-blocked (FEAT-19); an admin deletes
        // as an audited override. Grey out rather than let it fail server-side.
        disabled: baseReadOnly || isSystemEntry(entry) || lockedForMember,
        struck: isSystemEntry(entry),
        title: deleteHint(entry),
        onSelect: () => setConfirmDel(entry),
      },
    ]);

  const deleteHint = (entry: EntryView): string | undefined => {
    if (isSystemEntry(entry)) return t("entryMenu.protectedHint");
    if (lockedForMember) return t("entryMenu.lockedDeleteHint");
    return undefined;
  };

  const doDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    start(async () => {
      const res = await deleteEntryAction(scope.slug, target.id);
      if (!res.ok) {
        // Typed backend error → translated toast; keep the modal open.
        toast.push({ message: entryWriteErrorMessage(res, tErr) });
        return;
      }
      // Delete permanence (B4): hard delete, no undo affordance, on every path.
      toast.push({ message: t("toast.entryDeleted") });
      setConfirmDel(null);
    });
  };

  const activeFilters = types.length > 0 || query.trim().length > 0;
  const isArchived = scope.archived;

  let kindLabel = t("kind.project");
  if (scope.kind === "global") kindLabel = t("kind.globalFixed");
  else if (isArchived) kindLabel = t("kind.archived");

  // Flat (no nested ternary): the override variant vs. the normal delete, with
  // the working label while the action is in flight.
  let deleteConfirmLabel = deleteOverride ? t("deleteOverride.confirm") : t("deleteConfirm.confirm");
  if (pending) deleteConfirmLabel = t("deleteConfirm.working");

  return (
    <>
      <section className="entries-pane">
        <div className="entries-head">
          <div className="eh-top">
            <div className="eh-title">
              <h2>
                {scope.slug}
                <span className={`scope-kind${scope.kind === "global" ? " global" : ""}`}>
                  {kindLabel}
                </span>
              </h2>
              <div className="desc">{scope.description}</div>
            </div>
            {/* B1: icon-only header section (the space A3 freed). The lock is its
                only occupant — Export CSV / review-queue icons are out of CE scope. */}
            <div className="eh-ico">
              <ScopeLock scope={scope} isAdmin={isAdmin} />
            </div>
          </div>
          <div className={`write-note${callerMuted ? " muted" : ""}`}>
            <Icon name={callerMuted ? "lock" : "edit"} />
            <WriteNote scope={scope} isArchived={isArchived} callerMuted={Boolean(callerMuted)} />
          </div>
        </div>

        <div className="etoolbar">
          <div className="search">
            <Icon name="search" />
            <input
              defaultValue={query}
              onChange={(e) => setParam("q", e.target.value || null)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
            />
          </div>
          <div className="typefilters">
            {ENTRY_TYPE_ORDER.map((et) => {
              const on = types.includes(et);
              return (
                <button
                  key={et}
                  type="button"
                  className={`tf${on ? " on" : ""}`}
                  style={{ ["--tc" as unknown as string]: `var(--type-${et})` }}
                  onClick={() => toggleType(et)}
                  aria-pressed={on}
                >
                  <span className="sw" />
                  {tTypes(`${et}.label`)}
                  <span className="cnt">{counts[et]}</span>
                </button>
              );
            })}
          </div>
          <div className="toolbar-right">
            <span className="result-count">
              {t("resultCount", { count: rows.length })}
            </span>
            {/* A3: the primary CTA lives on the toolbar row (header top-right is
                freed for the lock control). density/layout stay URL-param driven. */}
            <Button
              className="etb-cta"
              variant="primary"
              disabled={memberReadOnly}
              onClick={() => setEditor({ entry: null })}
            >
              <Icon name="plus" />
              <span className="txt">{t("newEntry")}</span>
            </Button>
          </div>
        </div>

        {/* B2: read-only status band over the list when the scope is content-locked.
            Distinct from WriteNote (muted/global/archived) — role-dependent copy. */}
        {scope.locked ? (
          <output className="lock-band">
            <Icon name="lock" />
            <span>{isAdmin ? t("lockBand.admin") : t("lockBand.member")}</span>
          </output>
        ) : null}

        <div className="entries-body">
          {syncError ? (
            <ErrorState
              title={t("syncError.title")}
              body={t("syncError.body", { slug: scope.slug })}
              code={t("syncError.code", { slug: scope.slug })}
            >
              <Button variant="primary" onClick={() => router.refresh()}>
                <Icon name="rotate" />
                <span>{t("syncError.retry")}</span>
              </Button>
            </ErrorState>
          ) : rows.length === 0 && !activeFilters ? (
            <EmptyState
              icon="inbox"
              title={t("empty.title")}
              body={t("empty.body")}
            >
              <Button
                variant="primary"
                disabled={memberReadOnly}
                onClick={() => setEditor({ entry: null })}
              >
                <Icon name="plus" />
                <span>{t("empty.newEntry")}</span>
              </Button>
            </EmptyState>
          ) : rows.length === 0 && activeFilters ? (
            <EmptyState
              icon="search"
              title={t("noMatch.title")}
              body={t("noMatch.body", { slug: scope.slug, count: entries.length })}
            >
              <Button
                onClick={() => {
                  setParam("types", null);
                  setParam("q", null);
                }}
              >
                <Icon name="x" />
                <span>{t("noMatch.clear")}</span>
              </Button>
            </EmptyState>
          ) : layout === "table" ? (
            <table className={`etable${density ? " compact" : ""}`}>
              <thead>
                <tr>
                  <Th id="type" label={t("th.type")} sort={sort} setSort={setSort} className="col-type" />
                  <Th id="key" label={t("th.key")} sort={sort} setSort={setSort} className="col-key" />
                  <th className="col-content">{t("th.content")}</th>
                  <Th id="author" label={t("th.author")} sort={sort} setSort={setSort} className="col-author" />
                  <Th id="updated" label={t("th.updated")} sort={sort} setSort={setSort} className="col-updated" />
                  <th className="col-actions" aria-label={t("th.actionsAria")} />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} onClick={() => setEditor({ entry: e })}>
                    <td className="col-type">
                      <TypeChip type={e.type} />
                    </td>
                    <td className="col-key">
                      {e.key ? (
                        <span className="cell-key">{e.key}</span>
                      ) : (
                        <span className="cell-key empty">—</span>
                      )}
                    </td>
                    <td className="col-content">
                      <div className="cell-content">{e.content}</div>
                    </td>
                    <td className="col-author">
                      <AuthorCell entry={e} members={memberMap} />
                    </td>
                    <td className="col-updated">
                      <span className="cell-updated" title={absTime(e.updatedAt)}>
                        {relTime(e.updatedAt)}
                      </span>
                    </td>
                    <td className="col-actions">
                      <button
                        className="row-menu-btn"
                        aria-label={t("entryActionsAria")}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openRowMenu(ev, e);
                        }}
                        type="button"
                      >
                        <Icon name="more" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="ecards">
              {rows.map((e) => (
                <div
                  className="ecard"
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditor({ entry: e })}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setEditor({ entry: e });
                    }
                  }}
                >
                  <div className="ecard-top">
                    <TypeChip type={e.type} />
                    {e.key ? (
                      <span className="key-pill">{e.key}</span>
                    ) : (
                      <span className="key-pill empty">{t("noKey")}</span>
                    )}
                    <span className="spacer" />
                    <span className="updated" title={absTime(e.updatedAt)}>
                      {relTime(e.updatedAt)}
                    </span>
                  </div>
                  <div className="ecard-content">{e.content}</div>
                  <div className="ecard-foot">
                    <AuthorCell entry={e} members={memberMap} compact />
                    {e.reference ? (
                      <a
                        className="ref-link mono"
                        href={e.reference}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={e.reference}
                        onClick={(ev) => ev.stopPropagation()}
                        style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--c-muted)" }}
                      >
                        <Icon name="link" />
                        <span>{t("reference")}</span>
                      </a>
                    ) : null}
                  </div>
                  <button
                    className="row-menu-btn"
                    aria-label={t("entryActionsAria")}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openRowMenu(ev, e);
                    }}
                    type="button"
                  >
                    <Icon name="more" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {menu.node}
      {editor ? (
        <EntryEditor
          entry={editor.entry}
          scope={scope}
          existingKeys={entries.map((e) => e.key).filter((k): k is string => !!k)}
          scopeLocked={scope.locked}
          isAdmin={isAdmin}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {moveTarget ? (
        <MoveScopeDialog
          entry={moveTarget}
          scope={scope}
          scopes={scopes}
          onClose={() => setMoveTarget(null)}
        />
      ) : null}
      {confirmDel ? (
        <ConfirmModal
          // B4: an admin delete in a locked scope is an audited override — the
          // lockWarn alert variant. Delete is permanent on every path (no undo).
          eyebrow={deleteOverride ? t("deleteOverride.eyebrow") : t("deleteConfirm.eyebrow")}
          title={deleteOverride ? t("deleteOverride.title") : t("deleteConfirm.title")}
          body={deleteOverride ? t("deleteOverride.body") : t("deleteConfirm.body")}
          target={confirmDel.key ?? confirmDel.content.slice(0, 60) + "…"}
          confirmLabel={deleteConfirmLabel}
          confirmIcon="trash"
          danger
          lockWarn={deleteOverride}
          onCancel={() => setConfirmDel(null)}
          onConfirm={doDelete}
        />
      ) : null}
    </>
  );
}

function Th({
  id,
  label,
  sort,
  setSort,
  className,
}: Readonly<{
  id: SortCol;
  label: string;
  sort: Sort;
  setSort: (s: Sort) => void;
  className?: string;
}>) {
  const active = sort.col === id;
  let ariaSort: "ascending" | "descending" | "none" = "none";
  if (active) ariaSort = sort.dir === "asc" ? "ascending" : "descending";
  let chevronName = "chevSort";
  if (active) chevronName = sort.dir === "asc" ? "chevUp" : "chevDown";
  return (
    <th
      className={`${className ?? ""} sortable`}
      aria-sort={ariaSort}
      onClick={() =>
        setSort(active ? { col: id, dir: sort.dir === "asc" ? "desc" : "asc" } : { col: id, dir: "asc" })
      }
    >
      <span className="th-in">
        {label}
        <Icon name={chevronName} />
      </span>
    </th>
  );
}

function AuthorCell({
  entry,
  members,
  compact,
}: Readonly<{
  entry: EntryView;
  members: Map<string, string>;
  compact?: boolean;
}>) {
  const t = useTranslations("scopes");
  const isAgent = entry.source === "mcp";
  // authorName() already maps the __system__ sentinel → "System" and members → names.
  const name = isAgent ? t("viaAssistant") : authorName(entry.authorSubject, members);
  return (
    <div className={`cell-author${isAgent ? " agent" : ""}`}>
      <Avatar
        size="xs"
        isAgent={isAgent}
        initials={
          isAgent
            ? undefined
            : name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("")
        }
      />
      <span className="a-name">{name}</span>
    </div>
  );
}

/**
 * The write-target note under the scope header. Flat branches (no nested
 * ternary). When the caller is muted (D-CORE-2) the note states the suspension
 * plainly and calmly — reading + private memory are unaffected.
 */
export function WriteNote({
  scope,
  isArchived,
  callerMuted,
}: Readonly<{ scope: ScopeView; isArchived: boolean; callerMuted: boolean }>) {
  const t = useTranslations("scopes.writeNote");
  if (callerMuted) {
    return <span>{t("muted")}</span>;
  }
  if (scope.kind === "global") {
    return <span>{t.rich("global", { b: richB })}</span>;
  }
  if (isArchived) {
    return <span>{t("archived")}</span>;
  }
  return <span>{t.rich("project", { b: richB })}</span>;
}
