import type { Locale } from "@/i18n/config";

/**
 * Help-section manifest — the data source of the help area's
 * sub-navigation (`/help/[section]`).
 *
 * The navigation is data-driven so future sections are an entry here plus
 * a content page, never a menu rebuild. The manifest is empty today: the
 * help content does not exist yet, and an empty help area renders a clean
 * empty state rather than invented placeholder documentation.
 *
 * Labels carry one text per supported locale — the record type makes a
 * missing translation a compile error, not a silent fallback.
 *
 * A downstream composition build contributes additional items through
 * `getNavExtensions("help")` (see docs/extension-points.md); those are
 * merged after the manifest entries by the sub-navigation.
 */
export type HelpSection = {
  /** URL slug under /help/ — lowercase, url-safe, unique. */
  slug: string;
  /** Visible label, one text per supported locale. */
  label: Record<Locale, string>;
  /** Icon vocabulary of `@/components/ui/Icon` (unknown names fall back). */
  icon: string;
  /** Sort key — the navigation lists sections in ascending order. */
  order: number;
};

export const helpManifest: HelpSection[] = [
  // The memory-types reference. Its content is written section by
  // section; until then the section renders the pending note. The connect
  // area's usage examples deep-link here with the type slug as anchor
  // (/help/types#decision) — the content page carries one anchor per type.
  {
    slug: "types",
    label: { de: "Speicherarten", en: "Memory types" },
    icon: "layers",
    order: 10,
  },
];

/** Manifest entries in navigation order. */
export function helpSections(): HelpSection[] {
  return [...helpManifest].sort((a, b) => a.order - b.order);
}
