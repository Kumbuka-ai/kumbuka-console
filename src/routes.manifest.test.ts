/**
 * Route-manifest drift guard (see docs/extension-points.md). Walks
 * `src/app` for the files that create routes (`page.*`, `route.*`),
 * derives their URL paths, and asserts the manifest matches the
 * filesystem EXACTLY — a route file added or removed without a manifest
 * edit fails CI here, in the repo where the change was made. A downstream
 * build asserts the other half: every manifest entry has a re-export.
 */
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { routesManifest, type RouteManifestEntry } from "./routes.manifest";

const SRC_DIR = __dirname;
const APP_DIR = path.join(SRC_DIR, "app");
const ROUTE_FILE = /^(page|route)\.(ts|tsx|js|jsx)$/;

function walkRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkRouteFiles(abs);
    return ROUTE_FILE.test(entry.name) ? [abs] : [];
  });
}

/** "/scopes/[slug]" from "src/app/(app)/scopes/[slug]/page.tsx" — route
 *  groups `(…)` vanish from the URL, exactly as the App Router serves it. */
function routeOf(relFromApp: string): string {
  const segments = path
    .dirname(relFromApp)
    .split(path.sep)
    .filter((s) => s !== "." && !/^\(.*\)$/.test(s));
  return `/${segments.join("/")}`.replace(/\/+/g, "/");
}

function byRouteThenFile(a: RouteManifestEntry, b: RouteManifestEntry) {
  return a.route.localeCompare(b.route) || a.file.localeCompare(b.file);
}

describe("routes.manifest", () => {
  it("matches the src/app filesystem exactly", () => {
    const found = walkRouteFiles(APP_DIR)
      .map((abs) => {
        const relFromApp = path.relative(APP_DIR, abs);
        return {
          route: routeOf(relFromApp),
          file: path.posix.join("src/app", relFromApp.split(path.sep).join("/")),
        };
      })
      .sort(byRouteThenFile);

    expect([...routesManifest].sort(byRouteThenFile)).toEqual(found);
  });
});
