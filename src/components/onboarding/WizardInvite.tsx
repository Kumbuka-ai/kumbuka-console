"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/editors/SidePanel";

const richB = (c: ReactNode) => <b>{c}</b>;

// Mirrors InviteDialog's client-side gate (`/.+@.+\..+/`) but a touch stricter
// (no whitespace either side of the `@`/`.`) since we validate many lines at
// once. The backend remains the authority — see the per-address send result.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LineStatus = "ok" | "bad" | "dupe";
export type ParsedLine = { line: number; email: string; status: LineStatus; reason: "badEmail" | "alreadyMember" | "dupInList" | null };
export type SentResult = { email: string; ok: boolean };

/**
 * Pure per-line parser (exported for tests). Each non-empty line becomes one
 * ParsedLine with a line number and a status: ok / not-a-valid-email /
 * already-on-the-team / duplicate-in-list. `existingEmails` is the current
 * roster (lower-cased compare). Reason keys map to `onboarding.invite.*`.
 */
export function parseInviteLines(raw: string, existingEmails: readonly string[]): ParsedLine[] {
  const existing = new Set(existingEmails.map((e) => e.toLowerCase()));
  const seen = new Set<string>();
  const parsed: ParsedLine[] = [];
  raw.split("\n").forEach((line, i) => {
    const email = line.trim();
    if (!email) return;
    const lower = email.toLowerCase();
    let status: LineStatus = "ok";
    let reason: ParsedLine["reason"] = null;
    if (!EMAIL_RE.test(email)) {
      status = "bad";
      reason = "badEmail";
    } else if (existing.has(lower)) {
      status = "dupe";
      reason = "alreadyMember";
    } else if (seen.has(lower)) {
      status = "dupe";
      reason = "dupInList";
    } else {
      seen.add(lower);
    }
    parsed.push({ line: i + 1, email, status, reason });
  });
  return parsed;
}

/**
 * Step 2 — bulk invite. Textarea, one email per line, live per-line feedback;
 * valid addresses are routed through the real `inviteUserAction` (per address,
 * by the parent) and the backend's per-address result is shown as a
 * confirmation list.
 */
export function WizardInvite({
  existingEmails,
  sent,
  sending,
  onSend,
}: Readonly<{
  existingEmails: readonly string[];
  sent: SentResult[] | null;
  sending: boolean;
  onSend: (emails: string[]) => void;
}>) {
  const t = useTranslations("onboarding.invite");
  const [raw, setRaw] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    taRef.current?.focus();
  }, []);

  if (sent && sent.length) {
    const okCount = sent.filter((s) => s.ok).length;
    return (
      <div className="wz-invite">
        <div className="wz-sent">
          <div className="wz-sent-head">
            <Icon name="mail" />
            <span>{t("sentHead", { count: okCount })}</span>
          </div>
          <div className="wz-sent-list">
            {sent.map((s) => (
              <div className="wz-sent-row" key={s.email}>
                <span className="mono">{s.email}</span>
                <span className={`ustatus ${s.ok ? "invited" : "disabled"}`}>
                  <span className="dot" />
                  {s.ok ? t("pending") : t("failed")}
                </span>
              </div>
            ))}
          </div>
          <p className="wz-note">{t.rich("sentNote", { b: richB })}</p>
        </div>
      </div>
    );
  }

  const parsed = parseInviteLines(raw, existingEmails);
  const valid = parsed.filter((p) => p.status === "ok");
  const invalid = parsed.filter((p) => p.status !== "ok");

  return (
    <div className="wz-invite">
      <Field label={t("label")} hint={t("hint")}>
        <textarea
          ref={taRef}
          className="textarea mono"
          rows={7}
          value={raw}
          spellCheck={false}
          placeholder={t("placeholder")}
          onChange={(e) => setRaw(e.target.value)}
        />
      </Field>

      {parsed.length > 0 && (
        <div className="wz-parsed">
          <div className="wz-parsed-head">
            <span className="wz-count ok">{t("valid", { count: valid.length })}</span>
            {invalid.length > 0 && <span className="wz-count bad">{t("toFix", { count: invalid.length })}</span>}
          </div>
          <div className="wz-parsed-list">
            {parsed.map((p) => (
              <div className={`wz-line ${p.status}`} key={`${p.line}-${p.email}`}>
                <span className="wz-line-no mono">L{p.line}</span>
                <span className="wz-line-email mono">{p.email}</span>
                {p.status === "ok" ? (
                  <span className="wz-line-tag ok"><Icon name="check" />{t("ready")}</span>
                ) : (
                  <span className="wz-line-tag bad"><Icon name="warn" />{t(p.reason ?? "badEmail")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="primary"
        className="wz-send"
        disabled={valid.length === 0 || sending}
        onClick={() => onSend(valid.map((v) => v.email))}
      >
        <Icon name="mail" />
        <span className="txt">{t("send", { count: valid.length })}</span>
      </Button>
    </div>
  );
}
