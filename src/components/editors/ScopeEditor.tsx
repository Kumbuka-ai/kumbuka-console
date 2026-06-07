"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { createScopeAction, renameScopeAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/Toast";
import type { ScopeView } from "@/lib/api/types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ScopeEditor({
  scope,
  onClose,
}: {
  scope: ScopeView | null;
  onClose: () => void;
}) {
  const editing = !!scope;
  const [name, setName] = useState(scope?.name ?? "");
  const [slug, setSlug] = useState(scope?.slug ?? "");
  const [touchedSlug, setTouchedSlug] = useState(editing);
  const [pending, start] = useTransition();
  const toast = useToast();

  const valid = name.trim().length > 0 && slug.trim().length > 0;

  const submit = () => {
    if (!valid || pending) return;
    start(async () => {
      try {
        if (editing && scope) {
          await renameScopeAction(scope.slug, name.trim());
          toast.push({ message: "Scope renamed" });
        } else {
          await createScopeAction({ slug, name: name.trim() });
          toast.push({ message: `Scope ${slug} created` });
        }
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Save failed" });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel={editing ? "Rename scope" : "New scope"}
      eyebrow={editing ? "rename scope" : "new project scope"}
      title={editing ? "Rename scope" : "Create scope"}
      width={440}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid || pending} onClick={submit}>
            <Icon name="check" />
            <span className="txt">{editing ? "Save" : "Create scope"}</span>
          </Button>
        </>
      }
    >
      <Field label="Display name" required>
        <input
          className="input"
          value={name}
          placeholder="e.g. Billing Platform"
          onChange={(e) => {
            setName(e.target.value);
            if (!touchedSlug) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field
        label="Scope id"
        required
        hint="Stable, kebab-case. The assistant addresses the scope by this. Immutable after creation."
      >
        <input
          className="input mono"
          value={slug}
          spellCheck={false}
          disabled={editing}
          placeholder="billing-platform"
          onChange={(e) => {
            setTouchedSlug(true);
            setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      {!editing ? (
        <div className="idp-banner" style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}>
          <Icon name="shield" />
          <span>
            New scopes start empty and writable by admins. Adjust who may write in{" "}
            <b>Settings → write-scope policy</b>.
          </span>
        </div>
      ) : null}
    </SidePanel>
  );
}
