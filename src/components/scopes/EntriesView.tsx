"use client";

import { useMemo, useState, useTransition, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Seg, SegButton } from "@/components/ui/Seg";
import { TypeChip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState } from "@/components/ui/State";
import { EntryEditor } from "@/components/editors/EntryEditor";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { deleteEntryAction } from "@/app/(app)/actions";
import { relTime, absTime } from "@/lib/time";
import {
  ENTRY_TYPES,
  ENTRY_TYPE_ORDER,
  type EntryType,
  type EntryView,
  type ScopeView,
} from "@/lib/api/types";

type SortCol = "type" | "key" | "author" | "updated";
type Sort = { col: SortCol; dir: "asc" | "desc" };

function authorName(subject: string, members: Map<string, string>) {
  return members.get(subject) ?? subject;
}

export function EntriesView({
  scope,
  entries,
  members,
  syncError,
}: Readonly<{
  scope: ScopeView;
  entries: EntryView[];
  members: Record<string, string>;
  syncError?: boolean;
}>) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();

  const layout = (params.get("layout") as "table" | "cards" | null) ?? "table";
  const density = params.get("density") === "compact";
  const query = params.get("q") ?? "";
  const types = (params.get("types") ?? "")
    .split(",")
    .filter(Boolean) as EntryType[];

  const [editor, setEditor] = useState<{ entry: EntryView | null } | null>(null);
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

  const openRowMenu = (e: MouseEvent, entry: EntryView) =>
    menu.open(e, [
      { label: "Edit", icon: "edit", onSelect: () => setEditor({ entry }) },
      {
        label: "Copy key",
        icon: "copy",
        disabled: !entry.key,
        onSelect: async () => {
          if (entry.key) await navigator.clipboard?.writeText(entry.key);
          toast.push({ message: "Key copied" });
        },
      },
      { kind: "sep" },
      {
        label: "Delete",
        icon: "trash",
        danger: true,
        onSelect: () => setConfirmDel(entry),
      },
    ]);

  const doDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    start(async () => {
      try {
        await deleteEntryAction(scope.slug, target.id);
        toast.push({ message: "Entry deleted" });
        setConfirmDel(null);
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Delete failed" });
      }
    });
  };

  const activeFilters = types.length > 0 || query.trim().length > 0;
  const isArchived = scope.archived;

  let kindLabel = "project";
  if (scope.kind === "global") kindLabel = "global · fixed";
  else if (isArchived) kindLabel = "archived";

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
            <div className="eh-actions">
              <Button
                variant="primary"
                disabled={isArchived}
                onClick={() => setEditor({ entry: null })}
              >
                <Icon name="plus" />
                <span className="txt">New entry</span>
              </Button>
            </div>
          </div>
          <div className="write-note">
            <Icon name="edit" />
            {scope.kind === "global" ? (
              <span>
                Default write target for memories the assistant marks <b>org-wide</b>.
              </span>
            ) : isArchived ? (
              <span>Read-only — archived scopes can&apos;t be written to.</span>
            ) : (
              <span>
                Writable by <b>admins</b> and members assigned to this project.
              </span>
            )}
          </div>
        </div>

        <div className="etoolbar">
          <div className="search">
            <Icon name="search" />
            <input
              defaultValue={query}
              onChange={(e) => setParam("q", e.target.value || null)}
              placeholder="Search keys & content…"
              aria-label="Search entries"
            />
          </div>
          <div className="typefilters">
            {ENTRY_TYPE_ORDER.map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`tf${on ? " on" : ""}`}
                  style={{ ["--tc" as unknown as string]: `var(--type-${t})` }}
                  onClick={() => toggleType(t)}
                  aria-pressed={on}
                >
                  <span className="sw" />
                  {ENTRY_TYPES[t].label}
                  <span className="cnt">{counts[t]}</span>
                </button>
              );
            })}
          </div>
          <div className="toolbar-right">
            <span className="result-count">
              {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </span>
            <Seg ariaLabel="Layout">
              <SegButton on={layout === "table"} onClick={() => setParam("layout", "table")} title="Table">
                <Icon name="grid" />
              </SegButton>
              <SegButton on={layout === "cards"} onClick={() => setParam("layout", "cards")} title="Cards">
                <Icon name="layers" />
              </SegButton>
            </Seg>
            {layout === "table" ? (
              <Seg ariaLabel="Density">
                <SegButton on={!density} onClick={() => setParam("density", null)} title="Comfortable">
                  Comfort
                </SegButton>
                <SegButton on={density} onClick={() => setParam("density", "compact")} title="Compact">
                  Compact
                </SegButton>
              </Seg>
            ) : null}
          </div>
        </div>

        <div className="entries-body">
          {syncError ? (
            <ErrorState
              title="Couldn't reach this scope"
              body={`The backend returned a sync error while loading ${scope.slug}. The assistant's last-known copy may be stale.`}
              code={`503 · upstream_sync_failed · scope/${scope.slug}`}
            >
              <Button variant="primary" onClick={() => router.refresh()}>
                <Icon name="rotate" />
                <span>Retry</span>
              </Button>
            </ErrorState>
          ) : rows.length === 0 && !activeFilters ? (
            <EmptyState
              icon="inbox"
              title="No memories yet"
              body="This scope is empty. Add the first decision, convention, or constraint — or let the assistant write one as the team works."
            >
              <Button
                variant="primary"
                disabled={isArchived}
                onClick={() => setEditor({ entry: null })}
              >
                <Icon name="plus" />
                <span>New entry</span>
              </Button>
            </EmptyState>
          ) : rows.length === 0 && activeFilters ? (
            <EmptyState
              icon="search"
              title="Nothing matches"
              body={`No entries in ${scope.slug} match your filter. Clear it to see all ${entries.length}.`}
            >
              <Button
                onClick={() => {
                  setParam("types", null);
                  setParam("q", null);
                }}
              >
                <Icon name="x" />
                <span>Clear filters</span>
              </Button>
            </EmptyState>
          ) : layout === "table" ? (
            <table className={`etable${density ? " compact" : ""}`}>
              <thead>
                <tr>
                  <Th id="type" label="Type" sort={sort} setSort={setSort} className="col-type" />
                  <Th id="key" label="Key" sort={sort} setSort={setSort} className="col-key" />
                  <th>Content</th>
                  <Th id="author" label="Author" sort={sort} setSort={setSort} className="col-author" />
                  <Th id="updated" label="Updated" sort={sort} setSort={setSort} className="col-updated" />
                  <th className="col-actions" aria-label="Actions" />
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
                    <td>
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
                        aria-label="Entry actions"
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
                      <span className="key-pill empty">no key</span>
                    )}
                    <span className="spacer" />
                    <span className="updated" title={absTime(e.updatedAt)}>
                      {relTime(e.updatedAt)}
                    </span>
                  </div>
                  <div className="ecard-content">{e.content}</div>
                  <div className="ecard-foot">
                    <AuthorCell entry={e} members={memberMap} compact />
                  </div>
                  <button
                    className="row-menu-btn"
                    aria-label="Entry actions"
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
        <EntryEditor entry={editor.entry} scope={scope} onClose={() => setEditor(null)} />
      ) : null}
      {confirmDel ? (
        <ConfirmModal
          eyebrow="delete entry"
          title="Delete this memory?"
          body="The assistant will immediately stop recalling it."
          target={confirmDel.key ?? confirmDel.content.slice(0, 60) + "…"}
          confirmLabel={pending ? "Deleting…" : "Delete"}
          confirmIcon="trash"
          danger
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
  const isAgent = entry.source === "mcp";
  const name = isAgent ? "via assistant" : members.get(entry.authorSubject) ?? entry.authorSubject;
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
