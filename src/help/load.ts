import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Locale } from "@/i18n/config";
import { parseHelpDoc, type HelpDoc } from "./doc";

/**
 * Server-side help-document loader. The section documents ship inside this
 * package's `src`, so at runtime they live either in the app's own tree
 * (this repo standalone) or under node_modules (a composition build
 * consuming the package) — probe both from the app root. Loading is
 * strict: a missing or malformed document for a manifest section is a
 * thrown error, never an empty page (fail loud over a silently blank
 * help area).
 */
const CANDIDATE_ROOTS = [
  path.join(process.cwd(), "src/help/sections"),
  path.join(process.cwd(), "node_modules/@kumbuka-ai/console/src/help/sections"),
];

export function helpDocumentPath(slug: string, locale: Locale): string | null {
  for (const root of CANDIDATE_ROOTS) {
    const p = path.join(root, `${slug}.${locale}.md`);
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadHelpDoc(slug: string, locale: Locale): HelpDoc {
  const p = helpDocumentPath(slug, locale);
  if (!p) {
    throw new Error(`help section document not found: ${slug}.${locale}.md`);
  }
  return parseHelpDoc(readFileSync(p, "utf8"));
}
