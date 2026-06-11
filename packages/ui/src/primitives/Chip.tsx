/**
 * Chip — a label with an optional coloured swatch.
 *
 * Domain-agnostic on purpose: the consumer passes the colour via a CSS
 * variable name (e.g. `--type-decision`) and the visible label. This
 * keeps the UI library out of the memory-type taxonomy, which lives in
 * `@kumbuka-ai/api-client`.
 *
 * Usage with the kumbuka entry-type taxonomy:
 *
 *   import { Chip } from "@kumbuka-ai/ui/primitives";
 *   import { ENTRY_TYPES } from "@kumbuka-ai/api-client";
 *
 *   <Chip colorVar={`--type-${type}`} label={ENTRY_TYPES[type].label} />
 */
export function Chip({
  colorVar,
  label,
  boxed = false,
}: Readonly<{
  colorVar?: string;
  label: string;
  boxed?: boolean;
}>) {
  return (
    <span
      className={`tchip${boxed ? " boxed" : ""}`}
      style={colorVar ? { ["--tc" as unknown as string]: `var(${colorVar})` } : undefined}
    >
      {colorVar ? <span className="sw" aria-hidden /> : null}
      {label}
    </span>
  );
}

/** Backwards-compatible alias — the team console still imports `TypeChip`. */
export const TypeChip = Chip;
