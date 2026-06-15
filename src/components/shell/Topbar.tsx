import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleToggle } from "./LocaleToggle";
import { getLocale } from "@/lib/locale";
import type { Theme } from "@/lib/theme";

// Server component: reads the active locale itself so the 5 page-level
// callers don't each have to thread a `locale` prop (theme stays a prop —
// it's already threaded everywhere).
export async function Topbar({
  title,
  meta,
  theme,
  trailing,
}: Readonly<{
  title: string;
  meta: string;
  theme: Theme;
  trailing?: ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <header className="topbar">
      <div className="crumb">
        <h1>{title}</h1>
        <span className="crumb-meta">{"// "}{meta}</span>
      </div>
      <span className="topbar-spacer" />
      {trailing}
      <LocaleToggle locale={locale} />
      <ThemeToggle theme={theme} />
    </header>
  );
}
