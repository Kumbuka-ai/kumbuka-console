"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateSettingsAction } from "@/app/(app)/actions";
import type {
  CreateScopes,
  ScopeView,
  SettingsView,
  WritePolicy,
} from "@/lib/api/types";

// Module-scope rich-text renderers (not defined during render).
const richMono = (c: ReactNode) => <span className="mono">{c}</span>;

function RadioOpt({
  on,
  onClick,
  title,
  tag,
  tagAccent,
  desc,
  disabled,
}: Readonly<{
  on: boolean;
  onClick: () => void;
  title: string;
  tag?: string;
  tagAccent?: boolean;
  desc: string;
  disabled?: boolean;
}>) {
  return (
    <div
      className={`radio-opt${on ? " on" : ""}${disabled ? " disabled" : ""}`}
      role="radio"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="radio-dot" />
      <div>
        <div className="ro-title">
          {title}
          {tag ? <span className={`tag${tagAccent ? " accent" : ""}`}>{tag}</span> : null}
        </div>
        <div className="ro-desc">{desc}</div>
      </div>
    </div>
  );
}

export function SettingsForm({
  initial,
  projectScopes,
  isAdmin,
}: Readonly<{
  initial: SettingsView;
  projectScopes: ScopeView[];
  /** Settings are admin-write; a member sees the values read-only. */
  isAdmin: boolean;
}>) {
  const toast = useToast();
  const t = useTranslations("settings");
  const [writePolicy, setWritePolicy] = useState<WritePolicy>(initial.writePolicy);
  const [defaultScopeSlug, setDefaultScopeSlug] = useState<string | null>(initial.defaultScopeSlug);
  const [createScopes, setCreateScopes] = useState<CreateScopes>(initial.createScopes);
  const [saved, setSaved] = useState({
    writePolicy: initial.writePolicy,
    defaultScopeSlug: initial.defaultScopeSlug,
    createScopes: initial.createScopes,
  });
  const [pending, start] = useTransition();

  const dirty =
    writePolicy !== saved.writePolicy ||
    defaultScopeSlug !== saved.defaultScopeSlug ||
    createScopes !== saved.createScopes;

  const save = () => {
    start(async () => {
      try {
        const next = await updateSettingsAction({ writePolicy, defaultScopeSlug, createScopes });
        setSaved({
          writePolicy: next.writePolicy,
          defaultScopeSlug: next.defaultScopeSlug,
          createScopes: next.createScopes,
        });
        toast.push({ message: t("toast.saved") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("toast.saveFailed") });
      }
    });
  };

  const discard = () => {
    setWritePolicy(saved.writePolicy);
    setDefaultScopeSlug(saved.defaultScopeSlug);
    setCreateScopes(saved.createScopes);
  };


  return (
    <div className="page-scroll">
      <div className="page-pad settings-wrap">
        {/* Write policy ------------------------------------------------ */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("policy.eyebrow")}</span>
            <h3>{t("policy.title")}</h3>
            <p>{t("policy.desc")}</p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label={t("policy.groupAria")}>
              <RadioOpt
                on={writePolicy === "ask"}
                onClick={() => setWritePolicy("ask")}
                title={t("policy.ask_title")}
                tag={t("policy.tagRecommended")}
                tagAccent
                desc={t("policy.ask_desc")}
                disabled={!isAdmin}
              />
              <RadioOpt
                on={writePolicy === "project"}
                onClick={() => setWritePolicy("project")}
                title={t("policy.project_title")}
                desc={t("policy.project_desc")}
                disabled={!isAdmin}
              />
              <RadioOpt
                on={writePolicy === "global"}
                onClick={() => setWritePolicy("global")}
                title={t("policy.global_title")}
                tag={t("policy.tagBroad")}
                desc={t("policy.global_desc")}
                disabled={!isAdmin}
              />
            </div>
            {writePolicy === "project" ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label htmlFor="settings-fallback-scope">{t("policy.fallbackLabel")}</label>
                <div className="select-wrap">
                  <select
                    id="settings-fallback-scope"
                    className="select"
                    value={defaultScopeSlug ?? "global"}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setDefaultScopeSlug(e.target.value === "global" ? null : e.target.value)
                    }
                  >
                    <option value="global">{t("policy.fallbackGlobal")}</option>
                    {projectScopes.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.slug}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevDown" />
                </div>
                {/* dogfood-/console-crash: a project policy with no default scope
                    is a valid, non-crashing state — the write falls back to
                    global. Surface it as a clear needs-configuration note rather
                    than leaving it silent (mirrors the server's MISSING
                    defaultScopeStatus). */}
                {defaultScopeSlug === null ? (
                  <output className="hint">{t("policy.noDefaultHint")}</output>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Create scopes ---------------------------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("create.eyebrow")}</span>
            <h3>{t("create.title")}</h3>
            <p>{t.rich("create.desc", { code: richMono })}</p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label={t("create.groupAria")}>
              <RadioOpt
                on={createScopes === "admins"}
                onClick={() => setCreateScopes("admins")}
                title={t("create.admins_title")}
                tag={t("policy.tagRecommended")}
                tagAccent
                desc={t("create.admins_desc")}
                disabled={!isAdmin}
              />
              <RadioOpt
                on={createScopes === "members"}
                onClick={() => setCreateScopes("members")}
                title={t("create.members_title")}
                desc={t("create.members_desc")}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Private locked — surface 3 of 5 */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("private.eyebrow")}</span>
            <h3>{t("private.title")}</h3>
            <p>{t("private.desc")}</p>
          </div>
          <div className="set-body">
            <div className="set-locked">
              <div className="sl-icon">
                <Icon name="lock" />
              </div>
              <div>
                <div className="sl-title">{t("private.lockedTitle")}</div>
                <p>{t("private.lockedBody")}</p>
              </div>
              <span className="sl-state">
                <Icon name="lock" /> {t("private.enforced")}
              </span>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="set-savebar">
            <span className="sb-note">{dirty ? t("savebar.unsaved") : t("savebar.saved")}</span>
            <span className="spacer" />
            <Button disabled={!dirty || pending} onClick={discard}>
              {t("savebar.discard")}
            </Button>
            <Button variant="primary" disabled={!dirty || pending} onClick={save}>
              <Icon name="check" />
              <span className="txt">{t("savebar.save")}</span>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
