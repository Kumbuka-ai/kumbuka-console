import type { NavArea, NavExtension, SlotRegistry } from "./types";

/**
 * Default slot registry — the override target for a downstream build
 * (see docs/extension-points.md).
 *
 * This module is reached exclusively through the package specifier
 * `@kumbuka-ai/console/slots` (a package self-reference in this repo's own
 * build). A downstream build rebinds that one specifier to its own
 * registry module; nothing else in the package is patched.
 *
 * This app composes nothing: every slot renders its default, and no nav
 * area receives contributed items.
 */
export const slots: SlotRegistry = {};

const NAV_EXTENSIONS: Record<NavArea, NavExtension[]> = {
  rail: [],
  help: [],
};

/** Nav items contributed to `area`. This app contributes none. */
export function getNavExtensions(area: NavArea): NavExtension[] {
  return NAV_EXTENSIONS[area];
}
