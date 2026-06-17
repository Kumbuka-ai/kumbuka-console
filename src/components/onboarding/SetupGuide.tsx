"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useOnboarding } from "./OnboardingProvider";

/**
 * Re-open entry point for the onboarding wizard — lives in the rail foot
 * (prototype's `.setup-link`), above the account chip. Renders nothing for
 * non-owners (the wizard is owner-scoped; in beta = admin). Wired to the same
 * server-side onboarding state as the first-login auto-open.
 */
export function SetupGuide() {
  const { enabled, openWizard } = useOnboarding();
  const t = useTranslations("onboarding");
  if (!enabled) return null;
  return (
    <button type="button" className="setup-link" onClick={openWizard}>
      <Icon name="ok" />
      <span className="txt">{t("rail.setupGuide")}</span>
    </button>
  );
}
