"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { helpNavItems } from "@/help/nav";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

/**
 * Sub-navigation of the help area: the manifest sections
 * (src/help/manifest.ts) followed by items contributed through
 * `getNavExtensions("help")` (see src/help/nav.ts). With nothing in
 * either source it renders nothing — the page shows its empty state
 * instead.
 */
export function HelpNav() {
  const pathname = usePathname() ?? "";
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const items = helpNavItems();
  if (items.length === 0) return null;
  return (
    <nav className="help-nav" aria-label="Help sections">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
