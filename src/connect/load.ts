import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Locale } from "@/i18n/config";
import { parseGuide, type CellGuide } from "./guide";

/**
 * Server-side guide loader. The cell documents ship inside this package's
 * `src`, so at runtime they live either in the app's own tree (this repo
 * standalone) or under node_modules (a composition build consuming the
 * package) — probe both from the app root. Loading is strict: a missing
 * or malformed document for a cell that is about to render is a thrown
 * error, not an empty guide (fail loud over a silently blank wizard).
 */
const CANDIDATE_ROOTS = [
  path.join(process.cwd(), "src/connect/cells"),
  path.join(process.cwd(), "node_modules/@kumbuka-ai/console/src/connect/cells"),
];

export function cellDocumentPath(doc: string, locale: Locale): string | null {
  for (const root of CANDIDATE_ROOTS) {
    const p = path.join(root, `${doc}.${locale}.md`);
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadGuide(doc: string, locale: Locale): CellGuide {
  const p = cellDocumentPath(doc, locale);
  if (!p) {
    throw new Error(`connect cell guide not found: ${doc}.${locale}.md`);
  }
  return parseGuide(readFileSync(p, "utf8"));
}
