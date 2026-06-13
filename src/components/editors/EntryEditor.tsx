"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { ENTRY_TYPES, ENTRY_TYPE_ORDER, type EntryType, type EntryView, type ScopeView } from "@/lib/api/types";
import { createEntryAction, updateEntryAction } from "@/app/(app)/actions";
import { relTime } from "@/lib/time";
import { useToast } from "@/components/ui/Toast";

export function EntryEditor({
  entry,
  scope,
  onClose,
}: Readonly<{
  entry: EntryView | null;
  scope: ScopeView;
  onClose: () => void;
}>) {
  const editing = !!entry;
  const [type, setType] = useState<EntryType>(entry?.type ?? "decision");
  const [key, setKey] = useState(entry?.key ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();

  const canSave = content.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSave) return;
    start(async () => {
      try {
        if (editing && entry) {
          await updateEntryAction(scope.slug, entry.id, {
            type,
            content: content.trim(),
            reference: reference.trim(), // "" clears, a URL sets it
          });
          toast.push({ message: "Entry updated" });
        } else {
          await createEntryAction(scope.slug, {
            type,
            key: key.trim() || undefined,
            content: content.trim(),
            reference: reference.trim() || undefined,
          });
          toast.push({ message: `Entry created in ${scope.slug}` });
        }
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Save failed" });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel={editing ? "Edit entry" : "New entry"}
      eyebrow={`${scope.slug} ${editing ? "· edit" : "· new entry"}`}
      title={editing ? "Edit memory" : "New memory"}
      onClose={onClose}
      footer={
        <>
          {editing && entry ? (
            <span
              className="mono"
              style={{ fontSize: 10.5, color: "var(--c-muted)", letterSpacing: ".04em" }}
            >
              edited {relTime(entry.updatedAt)}
            </span>
          ) : null}
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSave} onClick={submit}>
            <Icon name="check" />
            <span className="txt">{editing ? "Save changes" : "Create entry"}</span>
          </Button>
        </>
      }
    >
      <Field label="Type" required>
        <div className="type-grid">
          {ENTRY_TYPE_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              className={`type-opt${type === t ? " on" : ""}`}
              style={{ ["--tc" as unknown as string]: `var(--type-${t})` }}
              onClick={() => setType(t)}
            >
              <span className="sw" />
              {ENTRY_TYPES[t].label}
            </button>
          ))}
        </div>
        <span className="hint">{ENTRY_TYPES[type].description}</span>
      </Field>

      <Field
        label="Key"
        hint="Optional stable identifier. Lowercase, dot-namespaced — the assistant looks entries up by this."
      >
        <input
          className="input mono"
          value={key}
          spellCheck={false}
          disabled={editing}
          placeholder="e.g. db.system-of-record"
          onChange={(e) => setKey(e.target.value.replace(/\s+/g, "-").toLowerCase())}
        />
      </Field>

      <Field label="Content" required>
        <textarea
          className="textarea"
          value={content}
          rows={6}
          placeholder="State it plainly, the way you'd want the assistant to recall it."
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>

      <Field
        label="Reference"
        hint="Optional link to where this came from. Stored as metadata — never fetched, and no credentials in the URL."
      >
        <input
          className="input mono"
          type="url"
          value={reference}
          spellCheck={false}
          placeholder="https://…"
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>

      <Field label="Scope">
        <div
          className="input"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default" }}
        >
          <Icon name={scope.kind === "global" ? "globe" : "folder"} />
          <span className="mono" style={{ fontSize: 13 }}>
            {scope.slug}
          </span>
          <span style={{ marginLeft: "auto", color: "var(--c-muted)", fontSize: 12 }}>
            {scope.kind === "global" ? "organization-wide" : "project"}
          </span>
        </div>
      </Field>
    </SidePanel>
  );
}
