"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { terminateSessionAction, updateMeAction } from "@/app/(app)/actions";
import { relTime } from "@/lib/time";
import type { ActiveSession, SessionView } from "@/lib/api/types";

/**
 * Keycloak Application-Initiated-Action aliases for the three security
 * deep-links. The already-authenticated user is sent straight into the
 * matching flow instead of the generic account-console signing-in page.
 */
const KC_ACTIONS = {
  credentials: "UPDATE_PASSWORD",
  twofa: "CONFIGURE_TOTP",
  passkey: "webauthn-register-passwordless",
} as const;

/**
 * Build the authorize-endpoint deep-link for one security action by appending
 * the console's own origin as `redirect_uri` (the backend's public host is the
 * MCP host, not the console) plus `kc_action`. Returns null when the backend
 * didn't supply the base (mock / older payload) or before the origin is known
 * (server render / pre-mount) — the caller then falls back to the plain
 * account-console link.
 */
export function aiaHref(base: string | undefined, origin: string | null, action: string): string | null {
  if (!base || !origin) return null;
  const redirect = encodeURIComponent(`${origin}/account`);
  return `${base}&redirect_uri=${redirect}&kc_action=${action}`;
}

/**
 * Account screen — D2 hybrid. Display name is the only in-app editable
 * field; password, 2FA, and passkey deep-link into the matching Keycloak
 * Application-Initiated-Action (kc_action) — same tab, returning to /account
 * with a `kc_action_status` the screen surfaces as a toast. Active
 * connections (D-CORE-8) are managed inline — a member can see and terminate
 * their own sessions without leaving the console.
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

  // The console's own origin, resolved client-side after mount. Used as the AIA
  // `redirect_uri` — kept out of the first render so the server and the initial
  // client render agree (no hydration mismatch); the hrefs upgrade from the
  // account-console fallback to the deep-links once known.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  // After a Keycloak Application-Initiated-Action, KC redirects back to
  // /account?kc_action_status=success|cancelled|… — surface it as a toast and
  // strip the params so a refresh doesn't re-fire. Reads window.location
  // directly (not useSearchParams) so the page needs no Suspense boundary.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("kc_action_status");
    if (!status) return;
    toast.push({
      message: status === "cancelled" ? t("security.actionCancelled") : t("security.actionDone"),
    });
    window.history.replaceState(null, "", "/account");
    // run once on mount; toast/t are stable for this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // The AIA deep-link for an action, or the account-console signing-in page as
  // the fallback (no base / pre-mount / no-JS).
  const actionHref = (action: string) =>
    aiaHref(session.securityActionUrl, origin, action) ?? `${kc}#/security/signingin`;

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
                href={actionHref(KC_ACTIONS.credentials)}
                icon="key"
                title={t("security.password_title")}
                sub={t("security.password_sub")}
              />
              <LinkOutMethod
                href={actionHref(KC_ACTIONS.twofa)}
                icon="phone"
                title={t("security.twofa_title")}
                sub={t("security.twofa_sub")}
              />
              <LinkOutMethod
                href={actionHref(KC_ACTIONS.passkey)}
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
  // Same-tab: the kc_action flow redirects back to /account, so a new tab
  // would orphan the result.
  return (
    <a className="method" href={href}>
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
