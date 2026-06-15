"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button, IconButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import { rotateSecretAction, updateSettingsAction } from "@/app/(app)/actions";
import type {
  ConnectorView,
  CreateScopes,
  ScopeView,
  SettingsView,
  WritePolicy,
} from "@/lib/api/types";

// Module-scope rich-text renderers (not defined during render).
const richB = (c: ReactNode) => <b>{c}</b>;
const richMono = (c: ReactNode) => <span className="mono">{c}</span>;
const richIdp = (c: ReactNode) => <span className="idp-name">{c}</span>;

function RadioOpt({
  on,
  onClick,
  title,
  tag,
  tagAccent,
  desc,
}: Readonly<{
  on: boolean;
  onClick: () => void;
  title: string;
  tag?: string;
  tagAccent?: boolean;
  desc: string;
}>) {
  return (
    <div
      className={`radio-opt${on ? " on" : ""}`}
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
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
  connector,
  projectScopes,
}: Readonly<{
  initial: SettingsView;
  connector: ConnectorView;
  projectScopes: ScopeView[];
}>) {
  const toast = useToast();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [writePolicy, setWritePolicy] = useState<WritePolicy>(initial.writePolicy);
  const [defaultScopeSlug, setDefaultScopeSlug] = useState<string | null>(initial.defaultScopeSlug);
  const [createScopes, setCreateScopes] = useState<CreateScopes>(initial.createScopes);
  const [saved, setSaved] = useState({
    writePolicy: initial.writePolicy,
    defaultScopeSlug: initial.defaultScopeSlug,
    createScopes: initial.createScopes,
  });
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [pending, start] = useTransition();
  const [secretMasked, setSecretMasked] = useState(connector.clientSecretMasked);

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

  const copy = async (v: string) => {
    await navigator.clipboard?.writeText(v);
    toast.push({ message: tCommon("copied") });
  };

  const doRotate = () => {
    start(async () => {
      try {
        const next = await rotateSecretAction();
        setSecretMasked(next.clientSecretMasked);
        setConfirmRotate(false);
        toast.push({ message: t("toast.rotated") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("toast.rotateFailed") });
      }
    });
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
              />
              <RadioOpt
                on={writePolicy === "project"}
                onClick={() => setWritePolicy("project")}
                title={t("policy.project_title")}
                desc={t("policy.project_desc")}
              />
              <RadioOpt
                on={writePolicy === "global"}
                onClick={() => setWritePolicy("global")}
                title={t("policy.global_title")}
                tag={t("policy.tagBroad")}
                desc={t("policy.global_desc")}
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
              />
              <RadioOpt
                on={createScopes === "members"}
                onClick={() => setCreateScopes("members")}
                title={t("create.members_title")}
                desc={t("create.members_desc")}
              />
            </div>
          </div>
        </div>

        {/* Connector --------------------------------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("connector.eyebrow")}</span>
            <h3>{t("connector.title")}</h3>
            <p>
              {t("connector.desc")}
              {secretMasked ? t("connector.descRotate") : ""}
            </p>
          </div>
          <div className="set-body">
            <div className="conn-light">
              <div className="cl-row">
                <span className="cl-label">{t("connector.endpoint")}</span>
                <span className="cl-val">{connector.mcpUrl}</span>
                <IconButton onClick={() => copy(connector.mcpUrl)} aria-label={t("connector.copyEndpoint")}>
                  <Icon name="copy" />
                </IconButton>
              </div>
              <div className="cl-row">
                <span className="cl-label">{t("connector.clientId")}</span>
                <span className="cl-val">{connector.clientId}</span>
                <IconButton onClick={() => copy(connector.clientId)} aria-label={t("connector.copyClientId")}>
                  <Icon name="copy" />
                </IconButton>
              </div>
              {secretMasked ? (
                <div className="cl-row">
                  <span className="cl-label">{t("connector.clientSecret")}</span>
                  <span className="cl-val mask">{secretMasked}</span>
                  <Button variant="danger" size="sm" onClick={() => setConfirmRotate(true)}>
                    <Icon name="rotate" />
                    <span className="txt">{t("connector.rotate")}</span>
                  </Button>
                </div>
              ) : (
                <div className="cl-row">
                  <span className="cl-label">{t("connector.clientSecret")}</span>
                  <span className="cl-val">{t("connector.noSecret")}</span>
                </div>
              )}
            </div>
            <div
              className="idp-banner"
              style={{ border: "1px solid var(--c-border)", padding: "13px 15px", marginTop: 14 }}
            >
              <Icon name="shield" />
              <span>{t.rich("connector.idpBanner", { idp: richIdp, b: richB })}</span>
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
      </div>

      {confirmRotate ? (
        <ConfirmModal
          eyebrow={t("rotate.eyebrow")}
          title={t("rotate.title")}
          body={t("rotate.body")}
          target={t("rotate.target", { clientId: connector.clientId })}
          confirmLabel={pending ? t("rotate.working") : t("rotate.confirm")}
          confirmIcon="rotate"
          danger
          onCancel={() => setConfirmRotate(false)}
          onConfirm={doRotate}
        />
      ) : null}
    </div>
  );
}
