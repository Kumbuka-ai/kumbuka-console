"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { ENTRY_TYPE_ORDER, SYSTEM_SUBJECT, type EntryType, type EntryView, type ScopeView } from "@/lib/api/types";
import { createEntryAction, updateEntryAction } from "@/app/(app)/actions";
import { entryWriteErrorMessage } from "@/lib/entryWriteError";
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
  const tErr = useTranslations("entryError");
  const tCommon = useTranslations("common");
  const tTypes = useTranslations("entryTypes");

  // Mirror the server key rule EXACTLY (E2E-06 / server MemoryKeyValidator):
  // lowercase a-z + 0-9, with single dot/hyphen separators; no underscores,
  // uppercase, slashes, or leading/trailing/double separators. Keep this regex
  // in lock-step with the server's — if one changes, change both.
  const KEY_RE = /^[a-z0-9]+([.-][a-z0-9]+)*$/;
  const keyTrimmed = key.trim();
  const keyInvalid = keyTrimmed.length > 0 && !KEY_RE.test(keyTrimmed);
  const canSave = content.trim().length > 0 && !keyInvalid && !pending;

  const submit = () => {
    if (!canSave) return;
    start(async () => {
      const res =
        editing && entry
          ? await updateEntryAction(scope.slug, entry.id, {
              type,
              content: content.trim(),
              reference: reference.trim(), // "" clears, a URL sets it
            })
          : await createEntryAction(scope.slug, {
              type,
              key: key.trim() || undefined,
              content: content.trim(),
              reference: reference.trim() || undefined,
            });
      if (!res.ok) {
        // Typed backend errors are surfaced as a translated toast — never let
        // a non-2xx bubble into the Server-Components render (SESSION-017).
        toast.push({ message: entryWriteErrorMessage(res, tErr) });
        return;
      }
      toast.push({ message: editing ? t("updated") : t("created", { slug: scope.slug }) });
      onClose();
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
          className={`input mono${keyInvalid ? " invalid" : ""}`}
          value={key}
          spellCheck={false}
          disabled={editing}
          aria-invalid={keyInvalid || undefined}
          placeholder={t("keyPlaceholder")}
          onChange={(e) => setKey(e.target.value.replace(/\s+/g, "-").toLowerCase())}
        />
        {keyInvalid ? <span className="field-error" role="alert">{t("keyError")}</span> : null}
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
