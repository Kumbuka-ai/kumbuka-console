import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { HelpNav } from "@/components/help/HelpNav";
import { getTheme } from "@/lib/theme";

/**
 * Help-area shell: one topbar and the data-driven sub-navigation, shared
 * by every help section (manifest entries and contributed ones alike).
 *
 * NOTE for a downstream composition build: this is an App Router
 * convention file, which the route manifest does not list — a composition
 * build must re-export it alongside the /help pages, or its help pages
 * render without the shared shell.
 */
export default async function HelpLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [t, theme] = await Promise.all([getTranslations("header"), getTheme()]);
  return (
    <>
      <Topbar title={t("help_title")} meta={t("help_meta")} theme={theme} />
      <div className="page-scroll">
        <div className="page-pad help-layout">
          <HelpNav />
          <div className="help-content">{children}</div>
        </div>
      </div>
    </>
  );
}
