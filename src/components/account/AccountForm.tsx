"use client";

import { useState, useTransition } from "react";
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

  const dirty = displayName.trim() !== savedName && displayName.trim().length > 0;

  const save = () => {
    if (!dirty || pending) return;
    start(async () => {
      try {
        const next = await updateMeAction({ displayName: displayName.trim() });
        setSavedName(next.displayName ?? "");
        toast.push({ message: "Profile updated" });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Save failed" });
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
                verified by Keycloak
              </span>
              <span className="rolebadge">
                <span className="dot" />
                {session.role}
              </span>
            </div>
          </div>
          <a className="btn" href={kc} target="_blank" rel="noreferrer">
            <Icon name="external" />
            <span className="txt">Open identity provider</span>
          </a>
        </div>

        {/* Display name (the only in-app editable field) --------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}profile</span>
            <h3>Display name</h3>
            <p>How your name appears next to entries you author in this console.</p>
          </div>
          <div className="set-body">
            <div className="field">
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
              />
              <span className="hint">
                Your email and login credentials are managed by Keycloak — use the link above to
                change them.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Button disabled={!dirty || pending} onClick={() => setDisplayName(savedName)}>
                Discard
              </Button>
              <Button variant="primary" disabled={!dirty || pending} onClick={save}>
                <Icon name="check" />
                <span className="txt">Save</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Credentials / MFA / Passkey — link-outs --------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}security</span>
            <h3>Sign-in & credentials</h3>
            <p>
              Password, two-factor authentication, and passkeys are managed in the Keycloak account
              console.
            </p>
          </div>
          <div className="set-body">
            <div className="methods">
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="key"
                title="Password"
                sub="Change your password or set up recovery options."
              />
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="phone"
                title="Two-factor authentication"
                sub="Authenticator app or one-time codes by email."
              />
              <LinkOutMethod
                href={`${kc}#/security/signingin`}
                icon="shield"
                title="Passkey"
                sub="Sign in with a hardware key or platform authenticator."
              />
            </div>
          </div>
        </div>

        {/* Active connections (D-CORE-8) — inline list + terminate ------ */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}active connections</span>
            <h3>Where you&apos;re signed in</h3>
            <p>
              Every active connection to Kumbuka — this console and any assistant connector. End any
              you don&apos;t recognise; that session&apos;s access is revoked immediately.
            </p>
          </div>
          <div className="set-body">
            <ConnectionsBody sessions={sessions} kcUrl={kc} />
          </div>
        </div>

        {/* Private guarantee — surface 4 of 5 -------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}your private memory</span>
            <h3>Yours alone</h3>
            <p>The space the assistant uses with you that nobody else can reach.</p>
          </div>
          <div className="set-body">
            <div className="set-locked">
              <div className="sl-icon">
                <Icon name="lock" />
              </div>
              <div>
                <div className="sl-title">Private memory is yours alone</div>
                <p>
                  Your private scope is owned by you. It is never shown in this console — not to
                  you, not to admins — and is never reachable through the connector. The assistant
                  reads and writes it only on your behalf, from your authenticated session.
                </p>
              </div>
              <span className="sl-state">
                <Icon name="lock" /> enforced
              </span>
            </div>
          </div>
        </div>

        {/* Sign out --------------------------------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">{"// "}session</span>
            <h3>Sign out</h3>
            <p>End your console session and log out at Keycloak.</p>
          </div>
          <div className="set-body">
            <a className="btn danger" href="/api/auth/logout">
              <Icon name="logout" />
              <span className="txt">Sign out</span>
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

/** Turn the OAuth client ids on a session into a human label + icon. */
function describeClients(clients: string[]): { icon: "monitor" | "bot" | "link"; label: string } {
  if (clients.some((c) => c.startsWith("kumbuka-connector"))) {
    const alias = clients
      .find((c) => c.startsWith("kumbuka-connector-"))
      ?.slice("kumbuka-connector-".length);
    return { icon: "bot", label: alias ? `Assistant connector · ${alias}` : "Assistant connector" };
  }
  if (clients.includes("kumbuka-admin")) {
    return { icon: "monitor", label: "Web console" };
  }
  return { icon: "link", label: clients[0] ?? "Session" };
}

/**
 * Renders the active-connections body. Early returns keep the three states
 * (load failure → link-out, empty, list) flat — no nested ternary.
 */
function ConnectionsBody({
  sessions,
  kcUrl,
}: Readonly<{ sessions: ActiveSession[] | null; kcUrl: string }>) {
  if (sessions === null) {
    return (
      <div className="field">
        <span className="hint">
          Couldn&apos;t load your active connections right now.{" "}
          <a href={`${kcUrl}#/security/device-activity`} target="_blank" rel="noreferrer">
            Manage them in the identity provider
          </a>
          {"."}
        </span>
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="field">
        <span className="hint">No other active connections.</span>
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
  const { icon, label } = describeClients(session.clients);

  const terminate = () => {
    if (pending) return;
    start(async () => {
      try {
        await terminateSessionAction(session.id);
        toast.push({ message: "Connection ended" });
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Couldn't end the connection" });
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
          {session.current ? <span className="s-cur">this device</span> : null}
        </div>
        <div className="s-meta">
          {session.ipAddress ? <span className="mono">{session.ipAddress}</span> : null}
          {session.ipAddress && session.lastAccessAt ? " · " : null}
          {session.lastAccessAt ? <span>active {relTime(session.lastAccessAt)}</span> : null}
        </div>
      </div>
      {session.current ? (
        <span className="s-revoke" aria-disabled="true">
          use Sign out below
        </span>
      ) : (
        <button type="button" className="s-revoke" onClick={terminate} disabled={pending}>
          End
        </button>
      )}
    </div>
  );
}
