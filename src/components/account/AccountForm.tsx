"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/editors/ConfirmModal";
import {
  deleteCredentialAction,
  logoutOtherSessionsAction,
  terminateSessionAction,
  updateMeAction,
} from "@/app/(app)/actions";
import { relTime } from "@/lib/time";
import type {
  ActiveSession,
  CredentialsView,
  CredentialType,
  CredentialView,
  SessionView,
} from "@/lib/api/types";

/**
 * Keycloak Application-Initiated-Action aliases for the security deep-links.
 * The already-authenticated user is sent straight into the matching flow
 * instead of the generic account-console signing-in page.
 */
const KC_ACTIONS = {
  credentials: "UPDATE_PASSWORD",
  twofa: "CONFIGURE_TOTP",
  passkey: "webauthn-register-passwordless",
} as const;

/** The two passkey credential types Keycloak may store, shown as one card. */
const PASSKEY_TYPES: ReadonlyArray<CredentialType> = ["webauthn", "webauthn-passwordless"];

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
 * Account screen — D2 hybrid. Display name is the only in-app editable field.
 * Security credentials (authenticator apps, passkeys) are LISTED and REMOVABLE
 * in-app (FEAT-32, fixes F-0075) — the backend reads/deletes them via the
 * Keycloak Admin API scoped to the caller; adding one still deep-links into the
 * matching Keycloak Application-Initiated-Action (kc_action), same tab,
 * returning to /account with a `kc_action_status` surfaced as a toast. Active
 * connections (D-CORE-8) are managed inline, including "sign out all other
 * sessions" (F-0082).
 */
export function AccountForm({
  session,
  sessions,
  credentials,
}: Readonly<{
  session: SessionView;
  sessions: ActiveSession[] | null;
  credentials: CredentialsView | null;
}>) {
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
  useEffect(() => setOrigin(globalThis.location.origin), []);

  // After a Keycloak Application-Initiated-Action, KC redirects back to
  // /account?kc_action_status=success|cancelled|… — surface it as a toast and
  // strip the params so a refresh doesn't re-fire. Reads window.location
  // directly (not useSearchParams) so the page needs no Suspense boundary.
  useEffect(() => {
    const status = new URLSearchParams(globalThis.location.search).get("kc_action_status");
    if (!status) return;
    toast.push({
      message: status === "cancelled" ? t("security.actionCancelled") : t("security.actionDone"),
    });
    globalThis.history.replaceState(null, "", "/account");
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

  const creds = credentials?.credentials ?? [];
  const otp = creds.filter((c) => c.type === "otp");
  const passkeys = creds.filter((c) => PASSKEY_TYPES.includes(c.type));

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

        {/* Security — password link-out + credential lists ------------- */}
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
            </div>

            {credentials === null ? (
              <div className="field" style={{ marginTop: 16 }}>
                <span className="hint">
                  {t("security.loadError")}{" "}
                  <a href={`${kc}#/security/signingin`} target="_blank" rel="noreferrer">
                    {t("security.manageIdp")}
                  </a>
                  {"."}
                </span>
              </div>
            ) : (
              <>
                <CredentialCard
                  icon="phone"
                  title={t("security.otp_title")}
                  desc={t("security.otp_desc")}
                  items={otp}
                  addLabel={t("security.otp_add")}
                  addHref={actionHref(KC_ACTIONS.twofa)}
                  genericLabel={t("security.otp_generic")}
                />
                <CredentialCard
                  icon="shield"
                  title={t("security.passkey_title")}
                  desc={t("security.passkey_desc")}
                  items={passkeys}
                  addLabel={t("security.passkey_add")}
                  addHref={actionHref(KC_ACTIONS.passkey)}
                  genericLabel={t("security.passkey_generic")}
                />
                {/* Recovery-codes card removed until the KC >= 26.3 upgrade +
                login-flow activation (F-0089, FEAT-40) — restore via revert of this PR. */}
              </>
            )}
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
 * A credential type card (authenticator apps OR passkeys). Lists the caller's
 * enrolled credentials with a per-row remove (ConfirmModal + toast), a counter
 * badge, and an "add" primary button that deep-links into the Keycloak AIA flow.
 * Empty state invites the first enrolment. `addHref` is null before the origin
 * resolves; the button falls back to the account-console link then.
 */
function CredentialCard({
  icon,
  title,
  desc,
  items,
  addLabel,
  addHref,
  genericLabel,
}: Readonly<{
  icon: IconName;
  title: string;
  desc: string;
  items: CredentialView[];
  addLabel: string;
  addHref: string;
  genericLabel: string;
}>) {
  const t = useTranslations("account.security");
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<CredentialView | null>(null);

  const remove = (cred: CredentialView) => {
    setConfirming(null);
    start(async () => {
      try {
        await deleteCredentialAction(cred.id);
        toast.push({ message: t("removed") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("removeFailed") });
      }
    });
  };

  return (
    <div className="cred-card">
      <div className="cred-head">
        <div className="ch-icon">
          <Icon name={icon} />
        </div>
        <div className="ch-text">
          <div className="ch-title">{title}</div>
          <div className="ch-desc">{desc}</div>
        </div>
        <span className="cred-badge">{t("count", { count: items.length })}</span>
      </div>

      {items.length === 0 ? (
        <div className="cred-empty">{t("none")}</div>
      ) : (
        <div className="cred-list">
          {items.map((c) => (
            <div className="cred-row" key={c.id}>
              <div className="cr-main">
                <div className="cr-label">{c.userLabel?.trim() || genericLabel}</div>
                <div className="cr-meta">
                  {c.createdDate ? t("added", { time: relTime(c.createdDate) }) : genericLabel}
                </div>
              </div>
              <button
                type="button"
                className="cr-remove"
                onClick={() => setConfirming(c)}
                disabled={pending}
                aria-label={t("remove")}
                title={t("remove")}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      <a className="btn cred-add" href={addHref}>
        <Icon name="plus" />
        <span className="txt">{addLabel}</span>
      </a>

      {confirming ? (
        <ConfirmModal
          eyebrow={t("removeEyebrow")}
          title={t("removeTitle")}
          body={t("removeBody")}
          target={confirming.userLabel?.trim() || genericLabel}
          confirmLabel={t("remove")}
          confirmIcon="trash"
          danger
          onCancel={() => setConfirming(null)}
          onConfirm={() => remove(confirming)}
        />
      ) : null}
    </div>
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
 * (load failure → link-out, empty, list) flat — no nested ternary. Below the
 * list, "sign out all other sessions" appears whenever there is more than one
 * connection (F-0082).
 */
function ConnectionsBody({
  sessions,
  kcUrl,
}: Readonly<{ sessions: ActiveSession[] | null; kcUrl: string }>) {
  const t = useTranslations("account.connections");
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

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

  const logoutOthers = () => {
    setConfirming(false);
    start(async () => {
      try {
        await logoutOtherSessionsAction();
        toast.push({ message: t("othersEnded") });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("othersFailed") });
      }
    });
  };

  return (
    <>
      <div className="sessions">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </div>
      {sessions.length > 1 ? (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn danger"
            onClick={() => setConfirming(true)}
            disabled={pending}
          >
            <Icon name="logout" />
            <span className="txt">{t("logoutOthers")}</span>
          </button>
        </div>
      ) : null}
      {confirming ? (
        <ConfirmModal
          eyebrow={t("logoutOthersEyebrow")}
          title={t("logoutOthersTitle")}
          body={t("logoutOthersBody")}
          confirmLabel={t("logoutOthers")}
          confirmIcon="logout"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={logoutOthers}
        />
      ) : null}
    </>
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
