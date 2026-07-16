/**
 * The two canonical identifier grammars, mirrored from the server (which
 * holds the same languages in its SlugPatterns holder, pinned by tests on
 * both sides):
 *
 * - SLUG_PATTERN — kebab slug: lowercase alphanumerics joined by single
 *   hyphens (scope slugs).
 * - KEY_PATTERN — namespaced key: lowercase alphanumerics joined by single
 *   dot or hyphen separators (memory keys).
 *
 * Both anchored — no leading, trailing, or doubled separator. The dot is
 * exclusive to the key grammar. The live checks these power are UX only;
 * the server 400/409 stays the authoritative gate.
 */

/** Kebab slug: scope slugs. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Namespaced key: memory keys (dot or hyphen separators). The escaped
 * hyphen is deliberate: the pattern string is pinned verbatim against the
 * server's Java form (which needs the escape), so the two sides stay
 * byte-comparable modulo quantifier flavour.
 */
export const KEY_PATTERN = /^[a-z0-9]+(?:[.\-][a-z0-9]+)*$/; // NOSONAR typescript:S6535 — escape kept for cross-layer pin parity

export const isValidSlug = (slug: string): boolean => SLUG_PATTERN.test(slug);

export const isValidKey = (key: string): boolean => KEY_PATTERN.test(key);

/**
 * name → immutable kebab-slug. The SINGLE source of the console's slug rule —
 * shared by the scope editor (ScopeEditor) and the onboarding wizard
 * (WizardScopes) so the two cannot drift (dogfood-19). Mirrors the server's
 * scope-slug derivation (lowercase a-z/0-9, separators collapse to single
 * hyphens, trimmed). Output is empty or matches SLUG_PATTERN by construction.
 */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
