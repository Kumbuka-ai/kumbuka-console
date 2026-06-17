"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setOnboardingAction } from "@/app/(app)/actions";
import type { OnboardingState } from "@/lib/api/types";
import { clampStep } from "./steps";
import { OnboardingWizard } from "./OnboardingWizard";

type OnboardingCtx = {
  /** True only for the tenant-owner (beta = admin); the wizard + rail entry
   *  render only when enabled. */
  enabled: boolean;
  open: boolean;
  openWizard: () => void;
};

const Ctx = createContext<OnboardingCtx | null>(null);

export function useOnboarding(): OnboardingCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  return ctx;
}

/**
 * D-CORE-10.1 — owns the wizard's open/step state and persists dismissal/resume
 * server-side via `setOnboardingAction` (never localStorage). First login (no
 * dismissed flag) auto-opens at the persisted resume step; the rail "Setup
 * guide" reopens it any time. Wraps the app shell so both the rail entry and
 * the wizard share one state.
 */
export function OnboardingProvider({
  enabled,
  initial,
  existingEmails,
  existingSlugs,
  children,
}: Readonly<{
  enabled: boolean;
  initial: OnboardingState | undefined;
  existingEmails: readonly string[];
  existingSlugs: readonly string[];
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(() => clampStep(initial?.lastStep ?? 0));

  // First-login auto-open: shown until dismissed (Finish or don't-show-again).
  // Runs once on mount; `initial`/`enabled` are server-rendered constants.
  useEffect(() => {
    if (enabled && !initial?.dismissed) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWizard = useCallback(() => setOpen(true), []);

  // Resumable close: persist the resume point, keep dismissed=false so it
  // reopens next login.
  const handleClose = useCallback(() => {
    setOpen(false);
    void setOnboardingAction({ dismissed: false, lastStep: step });
  }, [step]);

  // Permanent dismiss: Finish or don't-show-again — both reach the same state.
  const handleDismiss = useCallback(() => {
    setOpen(false);
    void setOnboardingAction({ dismissed: true, lastStep: step });
  }, [step]);

  const value = useMemo<OnboardingCtx>(() => ({ enabled, open, openWizard }), [enabled, open, openWizard]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {enabled && open && (
        <OnboardingWizard
          step={step}
          setStep={(n) => setStep(clampStep(n))}
          onClose={handleClose}
          onDismiss={handleDismiss}
          existingEmails={existingEmails}
          existingSlugs={existingSlugs}
        />
      )}
    </Ctx.Provider>
  );
}
