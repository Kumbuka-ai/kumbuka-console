/**
 * @kumbuka-ai/ui — design-system primitives + parametrisable shell +
 * trust-surface markers shared by the team console (`@kumbuka-ai/console`)
 * and the commercial ops console (`Kumbuka-ai/ops-console`).
 *
 * For tree-shakable imports prefer the subpaths
 * (`@kumbuka-ai/ui/primitives`, `@kumbuka-ai/ui/shell`,
 * `@kumbuka-ai/ui/modals`, `@kumbuka-ai/ui/markers`); this barrel
 * re-exports the public surface for convenience.
 */
export * from "./primitives";
export * from "./shell";
export * from "./modals";
export * from "./markers";
