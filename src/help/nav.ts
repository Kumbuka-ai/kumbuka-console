import { helpSections } from "./manifest";
// Overridable specifier (see docs/extension-points.md): a downstream build
// rebinds it to contribute help sections; by default it returns [].
import { getNavExtensions } from "@kumbuka-ai/console/slots";

/**
 * The help area's navigation items: manifest sections first, then items
 * contributed through `getNavExtensions("help")`. A plain module — used
 * by the server-side /help entry page (redirect target) and the
 * client-side sub-navigation alike.
 */
export function helpNavItems() {
  return [
    ...helpSections().map((s) => ({
      id: s.slug,
      href: `/help/${s.slug}`,
      label: s.label,
      icon: s.icon,
    })),
    ...getNavExtensions("help"),
  ];
}
