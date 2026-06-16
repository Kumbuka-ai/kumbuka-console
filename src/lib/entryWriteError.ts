import type { EntryActionResult } from "@/lib/api/types";

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * Map a failed entry write to a translated, human message. The caller binds
 * `t` to the `entryError` message namespace. Kept separate from the editor so
 * the side-panel editor and the inline delete share one mapping.
 */
export function entryWriteErrorMessage(
  res: Extract<EntryActionResult, { ok: false }>,
  t: Translate,
): string {
  switch (res.reason) {
    case "muted":
      return t("muted");
    case "forbidden":
      return t("onlyAdmins");
    case "protected":
      return t("protected");
    case "validation":
      return t("validation", { reason: res.detail ?? t("validationFallback") });
    default:
      return t("generic");
  }
}
