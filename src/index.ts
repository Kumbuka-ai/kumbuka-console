/**
 * Package barrel — the slot API and the route manifest, nothing else.
 * App code (pages, components, lib) is consumed via the subpath exports
 * (`@kumbuka-ai/console/app/*`, `.../components/*`, …), not through here.
 */
export { Slot } from "./slots/Slot";
// Registry access goes through the overridable specifier, never the
// relative path — otherwise a composition build's rebind would be bypassed.
export { getNavExtensions, slots } from "@kumbuka-ai/console/slots";
export type {
  NavArea,
  NavExtension,
  SlotId,
  SlotOverride,
  SlotRegistry,
} from "./slots/types";
export { routesManifest } from "./routes.manifest";
export type { RouteManifestEntry } from "./routes.manifest";
