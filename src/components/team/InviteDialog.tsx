"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "@/components/editors/SidePanel";
import { useToast } from "@/components/ui/Toast";
import { inviteUserAction } from "@/app/(app)/actions";
import type { UserRole } from "@/lib/api/types";

// Module-scope rich-text renderers (not defined during render).
const richB = (c: ReactNode) => <b>{c}</b>;
const richIdp = (c: ReactNode) => <span className="idp-name">{c}</span>;

// Loose "looks-like-an-email" client gate (the backend is the authority).
// Linear-time form of the prior `/.+@.+\..+/` (S8786 / ReDoS). The old pattern
// rescans the whole tail for a `.` after every `@`, which is O(n²) on a
// multi-`@` string; excluding `@` from the run before the separator bounds each
// scan to one `@`-delimited segment, killing the backtracking. Identical
// accept/reject for every input with 0 or 1 `@` (so every valid email and every
// realistic input); it differs only on multi-`@` garbage where a separator dot
// is reachable solely across an inner `@` (e.g. `x@b@.c`) — never a real email.
// Exported for the focused behaviour test; not a shared validator.
export const EMAIL_RE = /.@[^\n@][^\n@.]*\.[^\n]/;

export function InviteDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [pending, start] = useTransition();
  const toast = useToast();
  const t = useTranslations("team.inviteDialog");

  const valid = EMAIL_RE.test(email) && !pending;

  const submit = () => {
    if (!valid) return;
    start(async () => {
      try {
        await inviteUserAction({ email: email.trim(), displayName: name.trim() || undefined, role });
        toast.push({ message: t("sent") });
        onClose();
      } catch (err) {
        toast.push({ message: err instanceof Error ? err.message : t("failed") });
      }
    });
  };

  return (
    <SidePanel
      ariaLabel={t("ariaLabel")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            <Icon name="mail" />
            <span className="txt">{t("send")}</span>
          </Button>
        </>
      }
    >
      <div
        className="idp-banner"
        style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}
      >
        <Icon name="shield" />
        <span>{t.rich("banner", { idp: richIdp, b: richB })}</span>
      </div>
      <Field label={t("emailLabel")} required hint={t("emailHint")}>
        <input
          className="input mono"
          type="email"
          value={email}
          spellCheck={false}
          placeholder={t("emailPlaceholder")}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label={t("nameLabel")}>
        <input
          className="input"
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={t("roleLabel")} required>
        <div className="type-grid">
          <button
            type="button"
            className={`type-opt${role === "member" ? " on" : ""}`}
            style={{ ["--tc" as unknown as string]: "var(--c-muted)" }}
            onClick={() => setRole("member")}
          >
            <span className="sw" />{t("member")}
          </button>
          <button
            type="button"
            className={`type-opt${role === "admin" ? " on" : ""}`}
            style={{ ["--tc" as unknown as string]: "var(--accent)" }}
            onClick={() => setRole("admin")}
          >
            <span className="sw" />{t("admin")}
          </button>
        </div>
        <span className="hint">
          {role === "admin" ? t("adminHint") : t("memberHint")}
        </span>
      </Field>
    </SidePanel>
  );
}
