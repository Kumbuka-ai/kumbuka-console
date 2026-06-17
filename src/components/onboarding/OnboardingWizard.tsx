"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createScopeAction, inviteUserAction } from "@/app/(app)/actions";
import { WZ_STEP_COUNT, WZ_STEP_KEYS } from "./steps";
import { WizardExplain } from "./WizardExplain";
import { WizardInvite, type SentResult } from "./WizardInvite";
import { WizardScopes, type StagedScope } from "./WizardScopes";

/**
 * D-CORE-10.1 first-login onboarding wizard (shell). A centered overlay over
 * the console — scrim + Esc + click-away to close — with a 1·2·3 step rail,
 * each step skippable and resumable. Closing via X/scrim/Esc is *resumable*
 * (reopens next login) unless "don't show again" is ticked; Finish and
 * don't-show-again both reach the same dismissed state (the parent persists it
 * server-side). Translates the prototype's `OnboardingWizard` into the real
 * primitives (Button/Icon/Field/TypeChip/private-panel/useToast) and next-intl.
 */
export function OnboardingWizard({
  step,
  setStep,
  onClose,
  onDismiss,
  existingEmails,
  existingSlugs,
}: Readonly<{
  step: number;
  setStep: (n: number) => void;
  /** Resumable close (X / scrim / Esc, no don't-show-again). */
  onClose: () => void;
  /** Permanent dismiss (Finish, or close with don't-show-again ticked). */
  onDismiss: () => void;
  existingEmails: readonly string[];
  existingSlugs: readonly string[];
}>) {
  const t = useTranslations("onboarding");
  const toast = useToast();
  const [dontShow, setDontShow] = useState(false);
  const [sent, setSent] = useState<SentResult[] | null>(null);
  const [staged, setStaged] = useState<StagedScope[]>([]);
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const key = WZ_STEP_KEYS[step];
  const isLast = step === WZ_STEP_COUNT - 1;

  // closing via X / backdrop / Esc: permanent only if "don't show again" is ticked.
  const handleClose = () => {
    if (dontShow) onDismiss();
    else onClose();
  };

  // Open as a true modal: showModal() gives the top layer, the ::backdrop
  // scrim, native focus trapping, and aria-modal semantics. Guarded for
  // environments (jsdom) that don't implement it. Then move focus to the title.
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open && typeof d.showModal === "function") {
      try {
        d.showModal();
      } catch {
        /* already open / unsupported */
      }
    }
    headRef.current?.focus();
  }, []);

  // Backdrop click-away + Esc(cancel) close, wired programmatically rather than
  // via JSX handlers on the <dialog> (which jsx-a11y flags as listeners on a
  // non-interactive element). Re-bound when the close semantics change so the
  // live "don't show again" choice is honored.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onBackdrop = (e: globalThis.MouseEvent) => {
      if (e.target === d) handleClose();
    };
    const onCancel = (e: Event) => {
      e.preventDefault();
      handleClose();
    };
    d.addEventListener("click", onBackdrop);
    d.addEventListener("cancel", onCancel);
    return () => {
      d.removeEventListener("click", onBackdrop);
      d.removeEventListener("cancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dontShow, onClose, onDismiss]);

  const handleSend = (emails: string[]) => {
    start(async () => {
      // Each address is an independent invite through the real path; reconcile
      // the backend's per-address result with the client-side per-line view.
      const results: SentResult[] = await Promise.all(
        emails.map(async (email) => {
          try {
            await inviteUserAction({ email, role: "member" });
            return { email, ok: true };
          } catch {
            return { email, ok: false };
          }
        }),
      );
      setSent(results);
      const ok = results.filter((r) => r.ok).length;
      toast.push({ message: t("invite.sentToast", { count: ok }) });
    });
  };

  const finish = () => {
    start(async () => {
      if (staged.length) {
        const results = await Promise.all(
          staged.map(async (s) => {
            try {
              await createScopeAction({ slug: s.id, name: s.name });
              return true;
            } catch {
              return false;
            }
          }),
        );
        const ok = results.filter(Boolean).length;
        const failed = results.length - ok;
        if (ok) toast.push({ message: t("scopes.createdToast", { count: ok }) });
        if (failed) toast.push({ message: t("scopes.createFailed", { count: failed }) });
      }
      onDismiss();
    });
  };

  return (
    <dialog ref={dialogRef} className="wizard" aria-labelledby="wz-title">
      <div className="wz-head">
          <div className="wz-head-top">
            <span className="eyebrow">{"// "}{t("eyebrow", { step: step + 1, total: WZ_STEP_COUNT })}</span>
            <button type="button" className="iconbtn x" onClick={handleClose} aria-label={t("close")}>
              <Icon name="x" />
            </button>
          </div>
          <h2 id="wz-title" tabIndex={-1} ref={headRef}>
            {t(`${key}.title`)}
          </h2>
          <ul className="wz-steps" aria-label={t("stepsLabel")}>
            {WZ_STEP_KEYS.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  className={`wz-step${i === step ? " current" : ""}${i < step ? " done" : ""}`}
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="wz-step-node">{i < step ? <Icon name="check" /> : i + 1}</span>
                  <span className="wz-step-label">{t(`steps.${s}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="wz-body">
          {key === "explain" && <WizardExplain />}
          {key === "invite" && (
            <WizardInvite existingEmails={existingEmails} sent={sent} sending={pending} onSend={handleSend} />
          )}
          {key === "scopes" && (
            <WizardScopes existingSlugs={existingSlugs} staged={staged} setStaged={setStaged} />
          )}
        </div>

        <div className="wz-foot">
          <label className="wz-dontshow">
            <button
              type="button"
              role="switch"
              aria-checked={dontShow}
              className={`wz-toggle${dontShow ? " on" : ""}`}
              onClick={() => setDontShow((d) => !d)}
            />
            <span>{t("dontShowAgain")}</span>
          </label>
          <span className="spacer" />
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)}>
              <Icon name="chevRight" className="ico flip" />
              <span className="txt">{t("back")}</span>
            </Button>
          )}
          {!isLast && <Button onClick={() => setStep(step + 1)}>{t("skip")}</Button>}
          {isLast ? (
            <Button variant="primary" disabled={pending} onClick={finish}>
              <Icon name="check" />
              <span className="txt">{t("finish")}</span>
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              <span className="txt">{t("next")}</span>
              <Icon name="chevRight" />
            </Button>
          )}
        </div>
    </dialog>
  );
}
