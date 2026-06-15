"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { createScopeAction, renameScopeAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/Toast";
import type { ScopeView } from "@/lib/api/types";

const richB = (c: ReactNode) => <b>{c}</b>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ScopeEditor({
  scope,
  onClose,
}: Readonly<{
  scope: ScopeView | null;
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

  const valid = name.trim().length > 0 && slug.trim().length > 0;

  const submit = () => {
    if (!valid || pending) return;
    start(async () => {
      try {
        if (editing && scope) {
          await renameScopeAction(scope.slug, name.trim());
          toast.push({ message: t("renamed") });
        } else {
          await createScopeAction({ slug, name: name.trim() });
          toast.push({ message: t("created", { slug }) });
        }
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("saveFailed") });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel={editing ? t("renameAria") : t("newAria")}
      eyebrow={editing ? t("renameEyebrow") : t("newEyebrow")}
      title={editing ? t("renameTitle") : t("createTitle")}
      width={440}
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
      <Field
        label={t("idLabel")}
        required
        hint={t("idHint")}
      >
        <input
          className="input mono"
          value={slug}
          spellCheck={false}
          disabled={editing}
          placeholder={t("idPlaceholder")}
          onChange={(e) => {
            setTouchedSlug(true);
            setSlug(slugify(e.target.value));
          }}
        />
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
