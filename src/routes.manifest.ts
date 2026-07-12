/**
 * Route manifest — the drift guard between this package and a downstream
 * composition build (see docs/extension-points.md).
 *
 * Failure mode this exists for: a route is added here, a downstream build
 * does not re-export it, and both builds stay green — that console
 * silently loses a page. Two-sided guard instead:
 *
 *  - This repo: `routes.manifest.test.ts` walks `src/app` and asserts the
 *    manifest matches the filesystem exactly, so a new/removed route file
 *    fails CI here, where the change was made.
 *  - A downstream build asserts every manifest entry has a re-export.
 *
 * Neither side can drift alone. Keep entries sorted by `route`.
 */
export type RouteManifestEntry = {
  /** URL path as the App Router serves it (route groups stripped). */
  route: string;
  /** Source file, posix path relative to the package root. */
  file: string;
};

export const routesManifest: RouteManifestEntry[] = [
  { route: "/", file: "src/app/page.tsx" },
  { route: "/account", file: "src/app/(app)/account/page.tsx" },
  { route: "/api/health", file: "src/app/api/health/route.ts" },
  { route: "/help", file: "src/app/(app)/help/page.tsx" },
  { route: "/help/[section]", file: "src/app/(app)/help/[section]/page.tsx" },
  { route: "/overview", file: "src/app/(app)/overview/page.tsx" },
  { route: "/scopes", file: "src/app/(app)/scopes/page.tsx" },
  { route: "/scopes/[slug]", file: "src/app/(app)/scopes/[slug]/page.tsx" },
  { route: "/settings", file: "src/app/(app)/settings/page.tsx" },
  { route: "/signin", file: "src/app/signin/page.tsx" },
  { route: "/team", file: "src/app/(app)/team/page.tsx" },
];
