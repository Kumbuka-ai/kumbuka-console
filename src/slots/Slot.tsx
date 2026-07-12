import type { ReactNode } from "react";
// The registry is imported through the package self-reference so a
// downstream build can rebind exactly this specifier
// (see docs/extension-points.md).
import { slots } from "@kumbuka-ai/console/slots";
import type { SlotId } from "./types";

/**
 * Named extension point. Renders the registered override for `id` when a
 * downstream build bound one, otherwise the default.
 *
 * `fallback` is required by the type: there is no `<Slot>` without a
 * working default. A slot with nothing bound renders a complete surface —
 * held at compile time rather than by convention.
 */
export function Slot({ id, fallback }: Readonly<{ id: SlotId; fallback: ReactNode }>) {
  const Override = slots[id];
  return Override ? <Override /> : <>{fallback}</>;
}
