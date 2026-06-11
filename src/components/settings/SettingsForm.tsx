"use client";

import { useState, useTransition } from "react";
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

const IDP_NAME = "Keycloak";

function RadioOpt({
  on,
  onClick,
  title,
  tag,
  tagAccent,
  desc,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  tag?: string;
  tagAccent?: boolean;
  desc: string;
}) {
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
}: {
  initial: SettingsView;
  connector: ConnectorView;
  projectScopes: ScopeView[];
}) {
  const toast = useToast();
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
        toast.push({ message: "Settings saved" });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Save failed" });
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
    toast.push({ message: "Copied to clipboard" });
  };

  const doRotate = () => {
    start(async () => {
      try {
        const next = await rotateSecretAction();
        setSecretMasked(next.clientSecretMasked);
        setConfirmRotate(false);
        toast.push({ message: "Secret rotated — copy the new value" });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Rotate failed" });
      }
    });
  };

  return (
    <div className="page-scroll">
      <div className="page-pad settings-wrap">
        {/* Write policy ------------------------------------------------ */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// policy</span>
            <h3>Default write scope</h3>
            <p>Where the assistant writes a new memory when it isn&apos;t told which scope to use.</p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label="Default write scope">
              <RadioOpt
                on={writePolicy === "ask"}
                onClick={() => setWritePolicy("ask")}
                title="Ask each time"
                tag="recommended"
                tagAccent
                desc="The assistant proposes a scope and the member confirms before anything is written. Safest default for mixed teams."
              />
              <RadioOpt
                on={writePolicy === "project"}
                onClick={() => setWritePolicy("project")}
                title="Active project scope"
                desc="Writes land in whichever project the member is currently working in. Org-wide facts must be promoted manually."
              />
              <RadioOpt
                on={writePolicy === "global"}
                onClick={() => setWritePolicy("global")}
                title="Organization-wide"
                tag="broad"
                desc="Everything defaults to the global scope. Simple, but the shared baseline grows quickly — review regularly."
              />
            </div>
            {writePolicy === "project" ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Fallback scope when no project is active</label>
                <div className="select-wrap">
                  <select
                    className="select"
                    value={defaultScopeSlug ?? "global"}
                    onChange={(e) =>
                      setDefaultScopeSlug(e.target.value === "global" ? null : e.target.value)
                    }
                  >
                    <option value="global">global — organization-wide</option>
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
            <span className="eyebrow">// permissions</span>
            <h3>Who may create scopes</h3>
            <p>
              Project scopes carve the shared memory into spaces. The{" "}
              <span className="mono">global</span> scope is fixed and can&apos;t be created or
              removed.
            </p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label="Scope creation">
              <RadioOpt
                on={createScopes === "admins"}
                onClick={() => setCreateScopes("admins")}
                title="Admins only"
                tag="recommended"
                tagAccent
                desc="Only admins create, rename, and archive project scopes. Members read and write within them."
              />
              <RadioOpt
                on={createScopes === "members"}
                onClick={() => setCreateScopes("members")}
                title="Admins & members"
                desc="Any member can spin up a project scope. Faster for autonomous teams; expect more scopes to curate."
              />
            </div>
          </div>
        </div>

        {/* Connector --------------------------------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// connector</span>
            <h3>Connector details</h3>
            <p>
              The endpoint and credentials AI clients use to reach shared memory. Rotate the secret
              if it may have leaked.
            </p>
          </div>
          <div className="set-body">
            <div className="conn-light">
              <div className="cl-row">
                <span className="cl-label">Endpoint</span>
                <span className="cl-val">{connector.mcpUrl}</span>
                <IconButton onClick={() => copy(connector.mcpUrl)} aria-label="Copy endpoint">
                  <Icon name="copy" />
                </IconButton>
              </div>
              <div className="cl-row">
                <span className="cl-label">Client ID</span>
                <span className="cl-val">{connector.clientId}</span>
                <IconButton onClick={() => copy(connector.clientId)} aria-label="Copy client id">
                  <Icon name="copy" />
                </IconButton>
              </div>
              <div className="cl-row">
                <span className="cl-label">Client secret</span>
                <span className="cl-val mask">{secretMasked}</span>
                <Button variant="danger" size="sm" onClick={() => setConfirmRotate(true)}>
                  <Icon name="rotate" />
                  <span className="txt">Rotate</span>
                </Button>
              </div>
            </div>
            <div
              className="idp-banner"
              style={{ border: "1px solid var(--c-border)", padding: "13px 15px", marginTop: 14 }}
            >
              <Icon name="shield" />
              <span>
                Identity is delegated to <span className="idp-name">{IDP_NAME}</span>. Member
                accounts and passwords are managed under <b>Team</b>, not here.
              </span>
            </div>
          </div>
        </div>

        {/* Private locked — surface 3 of 5 */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// guarantee</span>
            <h3>Private memory</h3>
            <p>The one setting you can&apos;t change — and that&apos;s the point.</p>
          </div>
          <div className="set-body">
            <div className="set-locked">
              <div className="sl-icon">
                <Icon name="lock" />
              </div>
              <div>
                <div className="sl-title">Private scopes are always private</div>
                <p>
                  Each member&apos;s private memory is owned by them and is never exposed to
                  admins, this console, or the connector. There is no switch to turn this off — it
                  is enforced by the backend, not by configuration.
                </p>
              </div>
              <span className="sl-state">
                <Icon name="lock" /> enforced
              </span>
            </div>
          </div>
        </div>

        <div className="set-savebar">
          <span className="sb-note">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          <span className="spacer" />
          <Button disabled={!dirty || pending} onClick={discard}>
            Discard
          </Button>
          <Button variant="primary" disabled={!dirty || pending} onClick={save}>
            <Icon name="check" />
            <span className="txt">Save settings</span>
          </Button>
        </div>
      </div>

      {confirmRotate ? (
        <ConfirmModal
          eyebrow="rotate secret"
          title="Rotate the client secret?"
          body="The current secret stops working immediately. Any AI client using it must be reconfigured with the new value before it can read or write memory."
          target={`client secret · ${connector.clientId}`}
          confirmLabel={pending ? "Rotating…" : "Rotate secret"}
          confirmIcon="rotate"
          danger
          onCancel={() => setConfirmRotate(false)}
          onConfirm={doRotate}
        />
      ) : null}
    </div>
  );
}
