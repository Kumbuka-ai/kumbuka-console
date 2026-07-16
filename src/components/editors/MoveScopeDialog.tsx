"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SidePanel, Field } from "./SidePanel";
import { remapEntryAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/Toast";
import type { EntryView, ScopeActionResult, ScopeView } from "@/lib/api/types";
import { isValidKey } from "@/lib/slug";

/**
 * D-CORE-17: re-home an entry to another shared scope (admin only). The target
 * picker lists only shared scopes other than the current one and excludes
 * archived scopes (write-frozen). Private memory never appears in the console
 * scope list, so it is structurally excluded as a target (P1). A target
 * key-collision (409 KEY_EXISTS) reveals an optional key-override field so the
 * curator renames instead of clobbering — never a silent overwrite.
 */
export function MoveScopeDialog({
  entry,
  scope,
  scopes,
  onClose,
}: Readonly<{
  entry: EntryView;
  scope: ScopeView;
  scopes: readonly ScopeView[];
  onClose: () => void;
}>) {
  const t = useTranslations("editors.move");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const [pending, start] = useTransition();
  // Only revealed after a target collision (409 KEY_EXISTS).
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState(entry.key ?? "");

  const targets = useMemo(
    () => scopes.filter((s) => s.slug !== scope.slug && !s.archived),
    [scopes, scope.slug],
  );
  const [target, setTarget] = useState(targets[0]?.slug ?? "");

  // An empty override means "keep the current key"; a non-empty one must be
  // on the canonical key grammar (@/lib/slug, in lock-step with the server).
  const keyInvalid = showKey && key.trim().length > 0 && !isValidKey(key.trim());
  const canMove = target.length > 0 && !keyInvalid && !pending;

  const failMessage = (res: Extract<ScopeActionResult, { ok: false }>): string => {
    switch (res.reason) {
      case "exists":
        return t("errExists");
      case "forbidden":
        return t("errForbidden");
      case "validation":
        return res.detail ?? t("failed");
      default:
        return t("failed");
    }
  };

  const submit = () => {
    if (!canMove) return;
    start(async () => {
      const override = showKey ? key.trim() || undefined : undefined;
      const res = await remapEntryAction(scope.slug, entry.id, target, override);
      if (!res.ok) {
        // A target key-collision reveals the rename field so the curator can
        // resolve it in place; everything else is a translated toast.
        if (res.reason === "exists") setShowKey(true);
        toast.push({ message: failMessage(res) });
        return;
      }
      toast.push({ message: t("moved", { slug: target }) });
      onClose();
    });
  };

  return (
    <SidePanel
      ariaLabel={t("aria")}
      eyebrow={t("eyebrow", { slug: scope.slug })}
      title={t("title")}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button variant="primary" disabled={!canMove} onClick={submit}>
            <Icon name="check" />
            <span className="txt">{t("move")}</span>
          </Button>
        </>
      }
    >
      <Field label={t("entryLabel")}>
        <div className="input" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "default" }}>
          <span className="mono" style={{ fontSize: 13 }}>{entry.key ?? t("noKey")}</span>
          <span style={{ marginLeft: "auto", color: "var(--c-muted)", fontSize: 12 }}>{scope.slug}</span>
        </div>
      </Field>

      {targets.length === 0 ? (
        <div className="idp-banner" style={{ border: "1px solid var(--c-border)", padding: "13px 15px" }}>
          <Icon name="warn" />
          <span>{t("noTargets")}</span>
        </div>
      ) : (
        <Field label={t("targetLabel")} required hint={t("targetHint")}>
          <select
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {targets.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.slug}
                {s.kind === "global" ? ` — ${t("org")}` : ` — ${t("project")}`}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showKey ? (
        <Field label={t("keyLabel")} hint={t("keyHint")}>
          <input
            className={`input mono${keyInvalid ? " invalid" : ""}`}
            value={key}
            spellCheck={false}
            aria-invalid={keyInvalid || undefined}
            placeholder={t("keyPlaceholder")}
            onChange={(e) => setKey(e.target.value.replace(/\s+/g, "-").toLowerCase())}
          />
          {keyInvalid ? <span className="field-error" role="alert">{t("keyError")}</span> : null}
        </Field>
      ) : null}
    </SidePanel>
  );
}
