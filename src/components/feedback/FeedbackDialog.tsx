"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "@/components/editors/SidePanel";
import { useToast } from "@/components/ui/Toast";

// Module-scope rich-text renderer (not defined during render).
const richB = (c: ReactNode) => <b>{c}</b>;

export type FeedbackCategory = "bug" | "feature" | "general";

const CATEGORIES: ReadonlyArray<{ id: FeedbackCategory; tone: string }> = [
  { id: "bug", tone: "var(--type-fact, var(--accent))" },
  { id: "feature", tone: "var(--accent)" },
  { id: "general", tone: "var(--c-muted)" },
];

/**
 * FEAT-11 — in-product beta feedback form. Three categories (Bug-Report ·
 * Feature-Request · General feedback), one required free-text body and an
 * optional contact field. POSTs to the `/api/feedback` BFF route, which
 * forwards to the env-configured webhook. A 503 (channel not wired yet) and a
 * 502 (upstream error) both surface as a clear failure toast — never a silent
 * "thanks" on a dropped message.
 */
export function FeedbackDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const t = useTranslations("feedback");
  const toast = useToast();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [pending, start] = useTransition();

  const valid = message.trim().length > 0 && !pending;

  const submit = () => {
    if (!valid) return;
    start(async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            category,
            message: message.trim(),
            contact: contact.trim() || undefined,
          }),
        });
        if (!res.ok) {
          toast.push({ message: t("failed") });
          return;
        }
        toast.push({ message: t("sent") });
        onClose();
      } catch {
        toast.push({ message: t("failed") });
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
            <Icon name="message" />
            <span className="txt">{pending ? t("sending") : t("send")}</span>
          </Button>
        </>
      }
    >
      <div
        className="idp-banner"
        style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}
      >
        <Icon name="message" />
        <span>{t.rich("betaNotice", { b: richB })}</span>
      </div>
      <Field label={t("categoryLabel")} required>
        <div className="type-grid" role="radiogroup" aria-label={t("categoryLabel")}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              className={`type-opt${category === c.id ? " on" : ""}`}
              style={{ ["--tc" as unknown as string]: c.tone }}
              onClick={() => setCategory(c.id)}
            >
              <span className="sw" />
              {t(`category.${c.id}`)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("messageLabel")} required hint={t("messageHint")}>
        <textarea
          className="input"
          rows={6}
          value={message}
          placeholder={t("messagePlaceholder")}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <Field label={t("contactLabel")} hint={t("contactHint")}>
        <input
          className="input"
          value={contact}
          placeholder={t("contactPlaceholder")}
          onChange={(e) => setContact(e.target.value)}
        />
      </Field>
    </SidePanel>
  );
}
