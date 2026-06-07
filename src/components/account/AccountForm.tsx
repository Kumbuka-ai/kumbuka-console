"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { updateMeAction } from "@/app/(app)/actions";
import type { SessionView } from "@/lib/api/types";

/**
 * Account screen — D2 hybrid. Display name is the only in-app editable
 * field; credentials, MFA, passkey, and active sessions all link out to
 * the Keycloak account console.
 */
export function AccountForm({ session }: { session: SessionView }) {
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
            <span className="eyebrow">// profile</span>
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

        {/* Credentials / MFA / Passkey / Sessions — link-outs --------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// security</span>
            <h3>Sign-in & credentials</h3>
            <p>
              Password, two-factor authentication, passkeys, and active sessions are managed in the
              Keycloak account console.
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
              <LinkOutMethod
                href={`${kc}#/security/device-activity`}
                icon="monitor"
                title="Active sessions"
                sub="Devices currently signed in. Revoke any that aren't you."
              />
            </div>
          </div>
        </div>

        {/* Private guarantee — surface 4 of 5 -------------------------- */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// your private memory</span>
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
            <span className="eyebrow">// session</span>
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
}: {
  href: string;
  icon: "key" | "phone" | "shield" | "monitor";
  title: string;
  sub: string;
}) {
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
