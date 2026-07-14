/**
 * Recurrence guard: localStorage/sessionStorage are rejected in this console
 * (state that must survive lives server-side or in cookies/URL — see the
 * README). Collapse persistence in particular has to ride the session, so a
 * "quick" localStorage fallback must fail CI, not review.
 *
 * Comments may mention the words (they document the rule); code may not
 * touch the APIs.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname);
const EXTENSIONS = new Set([".ts", ".tsx"]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield p;
  }
}

/** Strip line + block comments, so documenting the ban stays legal. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("no web-storage usage anywhere in src", () => {
  it("no code path touches localStorage or sessionStorage", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const code = withoutComments(readFileSync(file, "utf8"));
      if (/\b(localStorage|sessionStorage)\b/.test(code)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders, `web storage used in: ${offenders.join(", ")}`).toEqual([]);
  });
});
