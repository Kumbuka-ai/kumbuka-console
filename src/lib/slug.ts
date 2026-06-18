/**
 * name → immutable kebab-slug. The SINGLE source of the console's slug rule —
 * shared by the scope editor (ScopeEditor) and the onboarding wizard
 * (WizardScopes) so the two cannot drift (dogfood-19). Mirrors the server's
 * scope-slug derivation (lowercase a-z/0-9, separators collapse to single
 * hyphens, trimmed).
 */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
