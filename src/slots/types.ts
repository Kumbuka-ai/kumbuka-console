import type { ComponentType } from "react";
import type { Locale } from "@/i18n/config";

/**
 * Extension-slot contract (see docs/extension-points.md). The console
 * exposes named mount points; a downstream composition build may bind an
 * override per id. Every `<Slot>` usage carries a mandatory default, so a
 * slot with nothing bound is a complete, working surface — never an empty
 * box.
 *
 * Ids grow only when a feature ships an extension point, never
 * speculatively.
 */
export type SlotId = "footer.support";

/**
 * A slot override renders in place of the default. Overrides take no
 * props: a slot is a mount point, not a data channel.
 */
export type SlotOverride = ComponentType;

/** Absent id → the default renders. */
export type SlotRegistry = Partial<Record<SlotId, SlotOverride>>;

/**
 * Nav areas that accept contributed items: the primary rail, and the
 * help area's sub-navigation (`/help/[section]`).
 */
export type NavArea = "rail" | "help";

/**
 * An additive nav item contributed by a downstream build. This repo
 * contributes none; an empty contribution renders nothing (no
 * placeholder, no badge).
 */
export type NavExtension = {
  /** Stable key, unique within the area. */
  id: string;
  /** Route the item links to. */
  href: string;
  /**
   * Visible label, one text per supported locale. The record type makes a
   * missing translation a compile error rather than a silent fallback.
   */
  label: Record<Locale, string>;
  /** Icon vocabulary of `@/components/ui/Icon` (unknown names fall back). */
  icon: string;
};
