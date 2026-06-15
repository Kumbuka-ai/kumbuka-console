"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { terminateSessionAction, updateMeAction } from "@/app/(app)/actions";
import { relTime } from "@/lib/time";
import type { ActiveSession, SessionView } from "@/lib/api/types";

/**
 * Account screen — D2 hybrid. Display name is the only in-app editable
 * field; credentials, MFA, and passkey link out to the Keycloak account
 * console. Active connections (D-CORE-8) are managed inline — a member can
 * see and terminate their own sessions without leaving the console.
 */
export function AccountForm({
  session,
  sessions,
}: Readonly<{ session: SessionView; sessions: ActiveSession[] | null }>) {
  const initial = session.displayName ?? "";
  const [displayName, setDisplayName] = useState(initial);
  const [savedName, setSavedName] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("account");
  const tRoles = useTranslations("roles");

  const dirty = displayName.trim() !== savedName && displayName.trim().length > 0;

  const save = () => {
    if (!dirty || pending) return;
    start(async () => {
      try {
        const next = await updateMeAction({ displayName: displayName.trim() });
        setSavedName(next.displayName ?? "");
        toast.push({ message: t("profile.updated") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("profile.saveFailed") });
      }
    });
  };

  const kc = session.accountConsoleUrl;

  return (
    <div className="page-scroll">
      <div className="page-pad account-wrap">
        {/* Identity header --------------------------------------------- */}
        <div className="acct-identity">
          <Avatar size="lg" initials={initialsOf(savedName)} />
          <div>
            <div className="ai-name">{savedName}</div>
            <div className="ai-email">
              <Icon name="mail" />
              {session.email}
            </div>
            <div className="ai-meta">
              <span className="verified">
                <Icon name="ok" />
                {t("verified")}
              </span>
              <span className="rolebadge">
                <span className="dot" />
                {tRoles(session.role)}
              </span>
            </div>
          </div>
          <a className="btn" href={kc} target="_blank" rel="noreferrer">
            <Icon name="external" />
            <span className="txt">{t("openIdp")}</span>
          </a>
        </div>

        {/* Display name (the only in-app editable field) --------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("profile.eyebrow")}</span>
            <h3>{t("profile.title")}</h3>
            <p>{t("profile.desc")}</p>
          </div>
          <div className="set-body">
            <div className="field">
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("profile.placeholder")}
                aria-label={t("profile.placeholder")}
              />
              <span className="hint">{t("profile.hint")}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Button disabled={!dirty || pending} onClick={() => setDisplayName(savedName)}>
                {t("profile.discard")}
              </Button>
              <Button variant="primary" disabled={!dirty || pending} onClick={save}>
                <Icon name="check" />
                <span className="txt">{t("profile.save")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Credentials / MFA / Passkey — link-outs --------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("security.eyebrow")}</span>
            <h3>{t("security.title")}</h3>
            <p>{t("security.desc")}</p>
          </div>
          <div className="set-body">
            <div className="methods">
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="key"
                title={t("security.password_title")}
                sub={t("security.password_sub")}
              />
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="phone"
                title={t("security.twofa_title")}
                sub={t("security.twofa_sub")}
              />
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="shield"
                title={t("security.passkey_title")}
                sub={t("security.passkey_sub")}
              />
            </div>
          </div>
        </div>

        {/* Active connections (D-CORE-8) — inline list + terminate ------ */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("connections.eyebrow")}</span>
            <h3>{t("connections.title")}</h3>
            <p>{t("connections.desc")}</p>
          </div>
          <div className="set-body">
            <ConnectionsBody sessions={sessions} kcUrl={kc} />
          </div>
        </div>

        {/* Private guarantee — surface 4 of 5 -------------------------- */}
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

        {/* Sign out --------------------------------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}{t("signout.eyebrow")}</span>
            <h3>{t("signout.title")}</h3>
            <p>{t("signout.desc")}</p>
          </div>
          <div className="set-body">
            <a className="btn danger" href="/api/auth/logout">
              <Icon name="logout" />
              <span className="txt">{t("signout.button")}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkOutMethod({
  href,
  icon,
  title,
  sub,
}: Readonly<{
  href: string;
  icon: "key" | "phone" | "shield" | "monitor";
  title: string;
  sub: string;
}>) {
  return (
    <a className="method" href={href} target="_blank" rel="noreferrer">
      <div className="m-icon">
        <Icon name={icon} />
      </div>
      <div>
        <div className="m-name">{title}</div>
        <div className="m-sub">{sub}</div>
      </div>
      <span style={{ color: "var(--c-muted)" }}>
        <Icon name="external" />
      </span>
    </a>
  );
}

/**
 * Classify the OAuth client ids on a session into an icon + a translation
 * descriptor. The visible label is resolved in SessionRow (where the i18n hook
 * lives) so this stays a pure, hook-free helper.
 */
type ClientDesc =
  | { icon: "bot"; kind: "connector"; alias?: string }
  | { icon: "monitor"; kind: "console" }
  | { icon: "link"; kind: "other"; fallback: string | null };

function describeClients(clients: string[]): ClientDesc {
  if (clients.some((c) => c.startsWith("kumbuka-connector"))) {
    const alias = clients
      .find((c) => c.startsWith("kumbuka-connector-"))
      ?.slice("kumbuka-connector-".length);
    return { icon: "bot", kind: "connector", alias };
  }
  if (clients.includes("kumbuka-admin")) {
    return { icon: "monitor", kind: "console" };
  }
  return { icon: "link", kind: "other", fallback: clients[0] ?? null };
}

/**
 * Renders the active-connections body. Early returns keep the three states
 * (load failure → link-out, empty, list) flat — no nested ternary.
 */
function ConnectionsBody({
  sessions,
  kcUrl,
}: Readonly<{ sessions: ActiveSession[] | null; kcUrl: string }>) {
  const t = useTranslations("account.connections");
  if (sessions === null) {
    return (
      <div className="field">
        <span className="hint">
          {t("loadError")}{" "}
          <a href={`${kcUrl}#/security/device-activity`} target="_blank" rel="noreferrer">
            {t("manageIdp")}
          </a>
          {"."}
        </span>
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="field">
        <span className="hint">{t("empty")}</span>
      </div>
    );
  }
  return (
    <div className="sessions">
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} />
      ))}
    </div>
  );
}

function SessionRow({ session }: Readonly<{ session: ActiveSession }>) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("account.connections");
  const d = describeClients(session.clients);
  const icon = d.icon;
  let label: string;
  if (d.kind === "connector") label = d.alias ? t("connectorAlias", { alias: d.alias }) : t("connector");
  else if (d.kind === "console") label = t("webConsole");
  else label = d.fallback ?? t("session");

  const terminate = () => {
    if (pending) return;
    start(async () => {
      try {
        await terminateSessionAction(session.id);
        toast.push({ message: t("ended") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("endFailed") });
      }
    });
  };

  return (
    <div className={`session${session.current ? " cur" : ""}`}>
      <div className="s-icon">
        <Icon name={icon} />
      </div>
      <div>
        <div className="s-dev">
          {label}
          {session.current ? <span className="s-cur">{t("thisDevice")}</span> : null}
        </div>
        <div className="s-meta">
          {session.ipAddress ? <span className="mono">{session.ipAddress}</span> : null}
          {session.ipAddress && session.lastAccessAt ? " · " : null}
          {session.lastAccessAt ? <span>{t("activeAgo", { time: relTime(session.lastAccessAt) })}</span> : null}
        </div>
      </div>
      {session.current ? (
        <span className="s-revoke" aria-disabled="true">
          {t("useSignout")}
        </span>
      ) : (
        <button type="button" className="s-revoke" onClick={terminate} disabled={pending}>
          {t("end")}
        </button>
      )}
    </div>
  );
}
