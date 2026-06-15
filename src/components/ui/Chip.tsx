/**
 * TypeChip — the entry-type chip with the colored swatch.
 * Swatch color comes from the per-type CSS variable (--type-decision, etc.)
 * defined in console-tokens.css for both light and dark themes.
 */
import { useTranslations } from "next-intl";
import type { EntryType } from "@/lib/api/types";

export function TypeChip({
  type,
  boxed = false,
  label,
}: Readonly<{
  type: EntryType;
  boxed?: boolean;
  label?: string;
}>) {
  const t = useTranslations("entryTypes");
  return (
    <span
      className={`tchip${boxed ? " boxed" : ""}`}
      style={{ ["--tc" as unknown as string]: `var(--type-${type})` }}
    >
      <span className="sw" aria-hidden />
      {label ?? t(`${type}.label`)}
    </span>
  );
}
