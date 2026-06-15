"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { ENTRY_TYPE_ORDER, SYSTEM_SUBJECT, type EntryType, type EntryView, type ScopeView } from "@/lib/api/types";
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
  // Protected D-CORE-11 system-seed entries are read-only: view the content,
  // can't change type/key/content, no save/cancel — just an OK to close.
  const locked = editing && entry?.authorSubject === SYSTEM_SUBJECT;
  const [type, setType] = useState<EntryType>(entry?.type ?? "decision");
  const [key, setKey] = useState(entry?.key ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("editors.entry");
  const tCommon = useTranslations("common");
  const tTypes = useTranslations("entryTypes");

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
          toast.push({ message: t("updated") });
        } else {
          await createEntryAction(scope.slug, {
            type,
            key: key.trim() || undefined,
            content: content.trim(),
            reference: reference.trim() || undefined,
          });
          toast.push({ message: t("created", { slug: scope.slug }) });
        }
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("saveFailed") });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel={editing ? t("editAria") : t("newAria")}
      eyebrow={editing ? t("eyebrowEdit", { slug: scope.slug }) : t("eyebrowNew", { slug: scope.slug })}
      title={editing ? t("editTitle") : t("newTitle")}
      onClose={onClose}
      footer={
        locked ? (
          <>
            <span className="spacer" />
            <Button variant="primary" onClick={onClose}>{tCommon("ok")}</Button>
          </>
        ) : (
          <>
            {editing && entry ? (
              <span
                className="mono"
                style={{ fontSize: 10.5, color: "var(--c-muted)", letterSpacing: ".04em" }}
              >
                {t("editedAgo", { time: relTime(entry.updatedAt) })}
              </span>
            ) : null}
            <span className="spacer" />
            <Button onClick={onClose}>{tCommon("cancel")}</Button>
            <Button variant="primary" disabled={!canSave} onClick={submit}>
              <Icon name="check" />
              <span className="txt">{editing ? t("saveChanges") : t("create")}</span>
            </Button>
          </>
        )
      }
    >
      <Field label={t("typeLabel")} required>
        <div className="type-grid">
          {ENTRY_TYPE_ORDER.map((et) => (
            <button
              key={et}
              type="button"
              className={`type-opt${type === et ? " on" : ""}`}
              style={{ ["--tc" as unknown as string]: `var(--type-${et})` }}
              disabled={locked}
              onClick={() => setType(et)}
            >
              <span className="sw" />
              {tTypes(`${et}.label`)}
            </button>
          ))}
        </div>
        <span className="hint">{tTypes(`${type}.description`)}</span>
      </Field>

      <Field label={t("keyLabel")} hint={t("keyHint")}>
        <input
          className="input mono"
          value={key}
          spellCheck={false}
          disabled={editing}
          placeholder={t("keyPlaceholder")}
          onChange={(e) => setKey(e.target.value.replace(/\s+/g, "-").toLowerCase())}
        />
      </Field>

      <Field label={t("contentLabel")} required>
        <textarea
          className="textarea"
          value={content}
          rows={6}
          readOnly={locked}
          placeholder={t("contentPlaceholder")}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>

      <Field label={t("refLabel")} hint={t("refHint")}>
        <input
          className="input mono"
          type="url"
          value={reference}
          spellCheck={false}
          readOnly={locked}
          placeholder={t("refPlaceholder")}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>

      <Field label={t("scopeLabel")}>
        <div
          className="input"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default" }}
        >
          <Icon name={scope.kind === "global" ? "globe" : "folder"} />
          <span className="mono" style={{ fontSize: 13 }}>
            {scope.slug}
          </span>
          <span style={{ marginLeft: "auto", color: "var(--c-muted)", fontSize: 12 }}>
            {scope.kind === "global" ? t("scopeOrg") : t("scopeProject")}
          </span>
        </div>
      </Field>
    </SidePanel>
  );
}
