"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { ENTRY_TYPE_ORDER, SYSTEM_SUBJECT, type EntryType, type EntryView, type ScopeView } from "@/lib/api/types";
import { createEntryAction, updateEntryAction } from "@/app/(app)/actions";
import { entryWriteErrorMessage } from "@/lib/entryWriteError";
import { relTime } from "@/lib/time";
import { useToast } from "@/components/ui/Toast";

// The entry-content contract: <= 1500 characters. Mirrors the server's
// validator and the database CHECK constraint — the counter tells the
// truth the backend enforces, it does not invent a client-side rule.
const CONTENT_MAX = 1500;
// The counter turns amber once this few characters remain, red at zero.
const CONTENT_WARN_AT = 100;

/** Right-aligned character budget under the content textarea: quiet by
 *  default, amber when close (<= CONTENT_WARN_AT left), red at the limit
 *  (the textarea's maxLength stops further input there). */
function ContentCounter({ length }: Readonly<{ length: number }>) {
  const locale = useLocale();
  const remaining = CONTENT_MAX - length;
  let tone = "";
  if (remaining <= 0) tone = " limit";
  else if (remaining <= CONTENT_WARN_AT) tone = " warn";
  return (
    <span className={`char-counter${tone}`} aria-live="polite">
      {length.toLocaleString(locale)} / {CONTENT_MAX.toLocaleString(locale)}
    </span>
  );
}

// Mirror the server key rule EXACTLY (E2E-06 / server MemoryKeyValidator):
// lowercase a-z + 0-9 with single dot/hyphen separators; no underscores,
// uppercase, slashes, or leading/trailing/double separators. An empty key is
// allowed (the key is optional). Keep this regex in lock-step with the server's.
const KEY_RE = /^[a-z0-9]+([.-][a-z0-9]+)*$/;
function isMalformedKey(key: string): boolean {
  const k = key.trim();
  return k.length > 0 && !KEY_RE.test(k);
}

type Mode = {
  /** Entry-level system-seed lock (D-CORE-11) — always read-only. */
  systemLocked: boolean;
  /** Member viewing an entry in a content-locked scope (read-only "View"). */
  memberView: boolean;
  /** Admin editing in a locked scope, before the "Edit despite lock" gesture. */
  lockHold: boolean;
  /** Admin editing in a locked scope, after the gesture (Cancel resets). */
  overrideEdit: boolean;
  /** Fields are non-editable. */
  readOnlyFields: boolean;
  /** The write, when it lands, is an audited admin override. */
  overrideActive: boolean;
  /** A fully read-only entry (system seed or member view) — OK-to-close footer. */
  readOnly: boolean;
};

// FEAT-19 / D-CORE-18: derive the editor's lock mode. Kept out of the component
// so the && composition doesn't blow the cognitive-complexity gate. The entry
// axis (systemLocked) and the scope axis compose — never replace each other.
function lockMode(
  editing: boolean,
  isSystemSeed: boolean,
  scopeLocked: boolean,
  isAdmin: boolean,
  override: boolean,
): Mode {
  const systemLocked = editing && isSystemSeed;
  const memberView = scopeLocked && !isAdmin && !systemLocked;
  const adminEditLocked = scopeLocked && isAdmin && editing && !systemLocked;
  const adminCreateLocked = scopeLocked && isAdmin && !editing;
  const lockHold = adminEditLocked && !override;
  return {
    systemLocked,
    memberView,
    lockHold,
    overrideEdit: adminEditLocked && override,
    readOnlyFields: systemLocked || memberView || lockHold,
    overrideActive: (adminEditLocked && override) || adminCreateLocked,
    readOnly: systemLocked || memberView,
  };
}

export function EntryEditor({
  entry,
  scope,
  existingKeys = [],
  scopeLocked = false,
  isAdmin = false,
  onClose,
}: Readonly<{
  entry: EntryView | null;
  scope: ScopeView;
  /** D-CORE-16: keys already in this scope — live dup-guard on a NEW entry so the
   *  curator renames instead of silently overwriting (dogfood-21). The server 409
   *  KEY_EXISTS is the backstop for the race/unloaded case. */
  existingKeys?: readonly string[];
  /** FEAT-19 / D-CORE-18: the scope carries the content lock. */
  scopeLocked?: boolean;
  /** FEAT-19: an admin may override a locked scope (audited server-side). */
  isAdmin?: boolean;
  onClose: () => void;
}>) {
  const editing = !!entry;
  const [override, setOverride] = useState(false);
  const m = lockMode(editing, entry?.authorSubject === SYSTEM_SUBJECT, scopeLocked, isAdmin, override);

  const [type, setType] = useState<EntryType>(entry?.type ?? "decision");
  const [key, setKey] = useState(entry?.key ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("editors.entry");
  const tErr = useTranslations("entryError");
  const tTypes = useTranslations("entryTypes");

  const keyInvalid = isMalformedKey(key);
  // D-CORE-16: on a NEW entry, a key already in this scope collides (no overwrite).
  // Editing an existing entry by its own key never collides (you're editing it).
  const keyCollides = !editing && key.trim().length > 0 && existingKeys.includes(key.trim());
  const canSave = !m.readOnlyFields && content.trim().length > 0 && !keyInvalid && !keyCollides && !pending;

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
      // Flat (no nested ternary): the override toast wins when the write was one.
      let okMsg = editing ? t("updated") : t("created", { slug: scope.slug });
      if (m.overrideActive) okMsg = t("override.saved");
      toast.push({ message: okMsg });
      onClose();
    });
  };

  let title = editing ? t("editTitle") : t("newTitle");
  let aria = editing ? t("editAria") : t("newAria");
  if (m.memberView) {
    title = t("viewTitle");
    aria = t("viewAria");
  }

  return (
    <SidePanel
      ariaLabel={aria}
      eyebrow={editing ? t("eyebrowEdit", { slug: scope.slug }) : t("eyebrowNew", { slug: scope.slug })}
      title={title}
      onClose={onClose}
      footer={
        <EditorFooter
          readOnly={m.readOnly}
          lockHold={m.lockHold}
          overrideEdit={m.overrideEdit}
          editing={editing}
          entry={entry}
          canSave={canSave}
          onEnterOverride={() => setOverride(true)}
          onCancelOverride={() => setOverride(false)}
          onClose={onClose}
          onSubmit={submit}
        />
      }
    >
      <OverrideBanner memberView={m.memberView} lockHold={m.lockHold} overrideActive={m.overrideActive} t={t} />

      <Field label={t("typeLabel")} required>
        <div className="type-grid">
          {ENTRY_TYPE_ORDER.map((et) => (
            <button
              key={et}
              type="button"
              className={`type-opt${type === et ? " on" : ""}`}
              style={{ ["--tc" as unknown as string]: `var(--type-${et})` }}
              disabled={m.readOnlyFields}
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
          className={`input mono${keyInvalid || keyCollides ? " invalid" : ""}`}
          value={key}
          spellCheck={false}
          disabled={editing || m.readOnlyFields}
          aria-invalid={keyInvalid || keyCollides || undefined}
          placeholder={t("keyPlaceholder")}
          onChange={(e) => setKey(e.target.value.replace(/\s+/g, "-").toLowerCase())}
        />
        {keyInvalid ? <span className="field-error" role="alert">{t("keyError")}</span> : null}
        {!keyInvalid && keyCollides ? (
          <span className="field-error" role="alert">{t("keyExists")}</span>
        ) : null}
      </Field>

      <Field label={t("contentLabel")} required>
        <textarea
          className="textarea"
          value={content}
          rows={6}
          maxLength={CONTENT_MAX}
          readOnly={m.readOnlyFields}
          placeholder={t("contentPlaceholder")}
          onChange={(e) => setContent(e.target.value)}
        />
        <ContentCounter length={content.length} />
      </Field>

      <Field label={t("refLabel")} hint={t("refHint")}>
        <input
          className="input mono"
          type="url"
          value={reference}
          spellCheck={false}
          readOnly={m.readOnlyFields}
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

/** The read-only / override notice band at the top of the editor (B3). */
function OverrideBanner({
  memberView,
  lockHold,
  overrideActive,
  t,
}: Readonly<{
  memberView: boolean;
  lockHold: boolean;
  overrideActive: boolean;
  t: ReturnType<typeof useTranslations<"editors.entry">>;
}>) {
  if (memberView) {
    return (
      <output className="override-band">
        <Icon name="lock" />
        <span>{t("override.memberBand")}</span>
      </output>
    );
  }
  if (lockHold) {
    return (
      <output className="override-band">
        <Icon name="lock" />
        <span>{t("override.lockHoldBand")}</span>
      </output>
    );
  }
  if (overrideActive) {
    return (
      <output className="override-band warn">
        <Icon name="warn" />
        <span>{t("override.band")}</span>
      </output>
    );
  }
  return null;
}

/**
 * The editor's footer. Extracted so EntryEditor stays under the cognitive
 * complexity gate. Modes: a read-only entry (system seed / member view) gets an
 * OK to close; an admin holding a locked scope gets an explicit "Edit despite
 * lock" gesture; otherwise the normal Cancel + Save (Cancel resets the override
 * when one is in progress).
 */
function EditorFooter({
  readOnly,
  lockHold,
  overrideEdit,
  editing,
  entry,
  canSave,
  onEnterOverride,
  onCancelOverride,
  onClose,
  onSubmit,
}: Readonly<{
  readOnly: boolean;
  lockHold: boolean;
  overrideEdit: boolean;
  editing: boolean;
  entry: EntryView | null;
  canSave: boolean;
  onEnterOverride: () => void;
  onCancelOverride: () => void;
  onClose: () => void;
  onSubmit: () => void;
}>) {
  const t = useTranslations("editors.entry");
  const tCommon = useTranslations("common");
  if (readOnly) {
    return (
      <>
        <span className="spacer" />
        <Button variant="primary" onClick={onClose}>{tCommon("ok")}</Button>
      </>
    );
  }
  if (lockHold) {
    return (
      <>
        <span className="spacer" />
        <Button onClick={onClose}>{tCommon("cancel")}</Button>
        <Button variant="primary" onClick={onEnterOverride}>
          <Icon name="edit" />
          <span className="txt">{t("override.editDespite")}</span>
        </Button>
      </>
    );
  }
  return (
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
      <Button onClick={overrideEdit ? onCancelOverride : onClose}>{tCommon("cancel")}</Button>
      <Button variant="primary" disabled={!canSave} onClick={onSubmit}>
        <Icon name="check" />
        <span className="txt">{editing ? t("saveChanges") : t("create")}</span>
      </Button>
    </>
  );
}
