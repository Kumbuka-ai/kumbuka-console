"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "@/components/editors/SidePanel";
import { useToast } from "@/components/ui/Toast";
import { inviteUserAction } from "@/app/(app)/actions";
import type { UserRole } from "@/lib/api/types";

const IDP_NAME = "Keycloak";

export function InviteDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [pending, start] = useTransition();
  const toast = useToast();

  const valid = /.+@.+\..+/.test(email) && !pending;

  const submit = () => {
    if (!valid) return;
    start(async () => {
      try {
        await inviteUserAction({ email: email.trim(), displayName: name.trim() || undefined, role });
        toast.push({ message: `Invite sent via ${IDP_NAME}` });
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : "Invite failed" });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel="Invite member"
      eyebrow="team · provision"
      title="Invite a member"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            <Icon name="mail" />
            <span className="txt">Send invite</span>
          </Button>
        </>
      }
    >
      <div
        className="idp-banner"
        style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}
      >
        <Icon name="shield" />
        <span>
          This creates the account in <span className="idp-name">{IDP_NAME}</span> and emails an
          enrolment link. No password is set here. Their <b>private</b> memory remains theirs and
          is never visible in this console.
        </span>
      </div>
      <Field label="Email" required hint="Must match the identity provider's directory domain.">
        <input
          className="input mono"
          type="email"
          value={email}
          spellCheck={false}
          placeholder="name@kumbuka.ai"
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Display name">
        <input
          className="input"
          value={name}
          placeholder="Optional — pulled from the IdP if blank"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Role" required>
        <div className="type-grid">
          <button
            type="button"
            className={`type-opt${role === "member" ? " on" : ""}`}
            style={{ ["--tc" as unknown as string]: "var(--c-muted)" }}
            onClick={() => setRole("member")}
          >
            <span className="sw" />Member
          </button>
          <button
            type="button"
            className={`type-opt${role === "admin" ? " on" : ""}`}
            style={{ ["--tc" as unknown as string]: "var(--accent)" }}
            onClick={() => setRole("admin")}
          >
            <span className="sw" />Admin
          </button>
        </div>
        <span className="hint">
          {role === "admin"
            ? "Admins manage scopes, members, and settings. They never see anyone's private memory."
            : "Members read and write shared scopes per the write-scope policy."}
        </span>
      </Field>
    </SidePanel>
  );
}
