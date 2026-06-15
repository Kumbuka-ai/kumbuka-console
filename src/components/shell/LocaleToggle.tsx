"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Seg, SegButton } from "@/components/ui/Seg";
import { setLocaleAction } from "@/app/(app)/actions";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

/**
 * Language switch — mirrors ThemeToggle, but the visible strings live in the
 * server-rendered messages, so after persisting we router.refresh() to
 * re-render server components in the new locale (no optimistic DOM swap).
 * setLocaleAction writes the cookie AND user_account.locale.
 */
export function LocaleToggle({ locale }: Readonly<{ locale: Locale }>) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const apply = (l: Locale) => {
    if (l === locale || pending) return;
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  };
  return (
    <Seg ariaLabel="Language">
      <SegButton on={locale === "de"} onClick={() => apply("de")} title={LOCALE_LABELS.de}>
        DE
      </SegButton>
      <SegButton on={locale === "en"} onClick={() => apply("en")} title={LOCALE_LABELS.en}>
        EN
      </SegButton>
    </Seg>
  );
}
