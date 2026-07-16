"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { createScopeAction, renameScopeAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/Toast";
import { isValidSlug, slugify } from "@/lib/slug";
import type { ScopeActionResult, ScopeView } from "@/lib/api/types";

const richB = (c: ReactNode) => <b>{c}</b>;

export function ScopeEditor({
  scope,
  existingSlugs = [],
  onClose,
}: Readonly<{
  scope: ScopeView | null;
  /** Live dup-guard against existing scope slugs (visible ones); the server
   *  typed 409 is the backstop for archived/race collisions (dogfood-19). */
  existingSlugs?: readonly string[];
  onClose: () => void;
}>) {
  const editing = !!scope;
  const [name, setName] = useState(scope?.name ?? "");
  const [slug, setSlug] = useState(scope?.slug ?? "");
  const [touchedSlug, setTouchedSlug] = useState(editing);
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("editors.scope");
  const tCommon = useTranslations("common");

  // Live shape check against the canonical kebab grammar — inline error
  // before submit; the server 400 stays the authoritative gate.
  const malformed = !editing && slug.length > 0 && !isValidSlug(slug);
  // Client dup-guard: only on create, only against the visible slugs we know.
  const dup = !editing && slug.trim().length > 0 && existingSlugs.includes(slug);
  const valid = name.trim().length > 0 && slug.trim().length > 0 && !malformed && !dup;

  const failMessage = (res: Extract<ScopeActionResult, { ok: false }>): string => {
    switch (res.reason) {
      case "exists":
        return t("errExists");
      case "forbidden":
        return t("errForbidden");
      case "validation":
        return res.detail ?? t("saveFailed");
      default:
        return t("saveFailed");
    }
  };

  const submit = () => {
    if (!valid || pending) return;
    start(async () => {
      const res = editing && scope
        ? await renameScopeAction(scope.slug, name.trim())
        : await createScopeAction({ slug, name: name.trim() });
      if (!res.ok) {
        toast.push({ message: failMessage(res) });
        return;
      }
      toast.push({ message: editing ? t("renamed") : t("created", { slug }) });
      onClose();
    });
  };

  return (
    <SidePanel
      ariaLabel={editing ? t("renameAria") : t("newAria")}
      eyebrow={editing ? t("renameEyebrow") : t("newEyebrow")}
      title={editing ? t("renameTitle") : t("createTitle")}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button variant="primary" disabled={!valid || pending} onClick={submit}>
            <Icon name="check" />
            <span className="txt">{editing ? t("save") : t("create")}</span>
          </Button>
        </>
      }
    >
      <Field label={t("nameLabel")} required>
        <input
          className="input"
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(e) => {
            setName(e.target.value);
            if (!touchedSlug) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label={t("idLabel")} required hint={t("idHint")}>
        <input
          className={`input mono${malformed || dup ? " invalid" : ""}`}
          value={slug}
          spellCheck={false}
          disabled={editing}
          aria-invalid={malformed || dup || undefined}
          placeholder={t("idPlaceholder")}
          onChange={(e) => {
            setTouchedSlug(true);
            // Gentle normalisation only (spaces → hyphen, lowercase) — same
            // treatment as the entry editor's key field. Everything else is
            // validated live instead of silently rewritten, so the field can
            // actually show what is wrong.
            setSlug(e.target.value.replace(/\s+/g, "-").toLowerCase());
          }}
        />
        {malformed ? <span className="field-error" role="alert">{t("idError")}</span> : null}
        {!malformed && dup ? (
          <span className="field-error" role="alert">{t("errExists")}</span>
        ) : null}
      </Field>
      {editing ? null : (
        <div className="idp-banner" style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}>
          <Icon name="shield" />
          <span>{t.rich("banner", { b: richB })}</span>
        </div>
      )}
    </SidePanel>
  );
}
