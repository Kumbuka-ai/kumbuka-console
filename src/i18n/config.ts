/**
 * Locale config — framework-agnostic, importable from BOTH server and client.
 * (src/lib/locale.ts is the server-only cookie accessor; it builds on this.)
 *
 * The backend persists the per-user choice in user_account.locale (#49,
 * Flyway V11) and /api/auth/me accepts a `locale` of exactly "en" | "de".
 */
export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** German is the product's primary language (docs + landing are de-first). */
export const DEFAULT_LOCALE: Locale = "de";

export const LOCALE_LABELS: Record<Locale, string> = { de: "Deutsch", en: "English" };

export function isLocale(v: unknown): v is Locale {
  return v === "de" || v === "en";
}
