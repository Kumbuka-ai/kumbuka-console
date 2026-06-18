"use client";

import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/editors/SidePanel";
import { AssistantPrompt } from "@/components/overview/AssistantPrompt";
import { slugify } from "@/lib/slug";
import type { ScopeView } from "@/lib/api/types";

const richMono = (c: ReactNode) => <span className="mono">{c}</span>;

export type StagedScope = { name: string; id: string };

/**
 * name → immutable kebab-slug id. Re-exports the shared `slugify` so the wizard,
 * the scope editor, and the dup-guard cannot drift (dogfood-19, single source).
 */
export const wzSlug = slugify;

/**
 * Step 3 — pre-create scopes. Name → live slug preview; stage multiple rows;
 * dup-guard against existing scope slugs AND already-staged ids. Finish (in the
 * shell) creates each via the real `createScopeAction` (project kind, empty).
 */
export function WizardScopes({
  existingSlugs,
  staged,
  setStaged,
}: Readonly<{
  existingSlugs: readonly string[];
  staged: StagedScope[];
  setStaged: Dispatch<SetStateAction<StagedScope[]>>;
}>) {
  const t = useTranslations("onboarding.scopes");
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const id = wzSlug(name);
  const taken = new Set<string>([...existingSlugs, ...staged.map((s) => s.id)]);
  const dup = id !== "" && taken.has(id);
  const canAdd = name.trim() !== "" && id !== "" && !dup;

  // D-GTM-6 B: surface the existing scope-bound assistant-prompt block for the
  // scopes the user just staged (created on Finish). The literal slug is the
  // staged id — the SAME slug Finish creates. Reuses AssistantPrompt verbatim
  // (no new prompt text); map each StagedScope to the ScopeView shape it expects.
  const stagedScopes: ScopeView[] = staged.map((s) => ({
    slug: s.id,
    name: s.name,
    kind: "project",
    fixed: false,
    archived: false,
    description: null,
    entryCount: 0,
    createdAt: "",
  }));

  const add = () => {
    if (!canAdd) return;
    setStaged((prev) => [...prev, { name: name.trim(), id }]);
    setName("");
    nameRef.current?.focus();
  };

  const removeAt = (index: number) => setStaged((prev) => prev.filter((_, j) => j !== index));

  return (
    <div className="wz-scopes-step">
      <p className="wz-lead">{t.rich("lead", { m: richMono })}</p>

      <div className="wz-addscope">
        <Field label={t("nameLabel")} hint={t("nameHint")}>
          <input
            ref={nameRef}
            className="input"
            value={name}
            placeholder={t("namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </Field>
        <div className="wz-slug-preview">
          <span className="wz-slug-label">{t("idLabel")}</span>
          <span className="wz-slug-val mono">{id || "—"}</span>
          {dup && <span className="wz-slug-dup">{t("alreadyExists")}</span>}
        </div>
        <Button className="wz-add-btn" disabled={!canAdd} onClick={add}>
          <Icon name="plus" />
          <span className="txt">{t("add")}</span>
        </Button>
      </div>

      {staged.length > 0 && (
        <div className="wz-staged">
          <div className="wz-staged-head">
            <span className="eyebrow">{"// "}{t("toCreate", { count: staged.length })}</span>
          </div>
          {staged.map((s, i) => (
            <div className="wz-staged-row" key={s.id}>
              <Icon name="folder" />
              <span className="wz-staged-name">{s.name}</span>
              <span className="wz-staged-id mono">{s.id}</span>
              <button
                type="button"
                className="wz-staged-x iconbtn"
                aria-label={t("remove", { name: s.name })}
                onClick={() => removeAt(i)}
              >
                <Icon name="x" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="wz-globalnote">
        <Icon name="globe" />
        <span>{t.rich("globalNote", { m: richMono })}</span>
      </div>

      {stagedScopes.length > 0 ? (
        <div className="wz-staged-prompt">
          <AssistantPrompt scopes={stagedScopes} />
        </div>
      ) : null}
    </div>
  );
}
