/**
 * Connect-manifest guards. The type system already pins agent slugs and
 * apparatus names (an unknown one is a compile error); these tests hold
 * what types cannot:
 *
 *  - every (agent, apparatus) tuple is unique,
 *  - only `verified` renders — the single visibility rule,
 *  - the apparatus switcher never offers a surface without a visible
 *    cell (Grok gets no code tab — not one saying "coming soon", none),
 *  - a `verified` cell must have BOTH guide documents, parseable, with
 *    the `authoring:` marker cleared and at least one step — the
 *    coupling that makes it impossible to ship an unwritten guide.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CONNECT_AGENTS,
  CONNECT_CELLS,
  agentsWithVisibleCells,
  apparatusFor,
  visibleCells,
  type ConnectCell,
} from "./manifest";
import { parseGuide } from "./guide";
import { LOCALES } from "@/i18n/config";

const CELLS_DIR = path.join(__dirname, "cells");

describe("connect manifest", () => {
  it("cells are unique per (agent, apparatus)", () => {
    const keys = CONNECT_CELLS.map((c) => `${c.agent}/${c.apparatus}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only verified cells are visible — untested and not-applicable are indistinguishable", () => {
    const untested: ConnectCell[] = [
      { agent: "claude", apparatus: "web", status: "untested", doc: "claude-web" },
    ];
    const notApplicable: ConnectCell[] = [
      { agent: "claude", apparatus: "web", status: "not-applicable" },
    ];
    expect(visibleCells(untested)).toEqual([]);
    expect(visibleCells(notApplicable)).toEqual([]);
    expect(agentsWithVisibleCells(untested)).toEqual([]);
    expect(agentsWithVisibleCells(notApplicable)).toEqual([]);
  });

  it("a verified cell is visible and drives the picker", () => {
    const cells: ConnectCell[] = [
      { agent: "claude", apparatus: "web", status: "verified", doc: "claude-web" },
      { agent: "claude", apparatus: "desktop", status: "untested" },
      { agent: "grok", apparatus: "web", status: "untested", doc: "grok-web" },
    ];
    expect(visibleCells(cells)).toHaveLength(1);
    expect(agentsWithVisibleCells(cells).map((a) => a.slug)).toEqual(["claude"]);
    // The apparatus switcher offers only surfaces with a visible cell.
    expect(apparatusFor("claude", cells)).toEqual(["web"]);
    expect(apparatusFor("grok", cells)).toEqual([]);
  });

  it("grok carries no desktop/code surface — not-applicable, structurally", () => {
    const grok = CONNECT_CELLS.filter((c) => c.agent === "grok");
    expect(grok.find((c) => c.apparatus === "desktop")?.status).toBe("not-applicable");
    expect(grok.find((c) => c.apparatus === "code")?.status).toBe("not-applicable");
  });

  it("every agent in the manifest exists exactly once in the agent list", () => {
    const slugs = CONNECT_AGENTS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const cell of CONNECT_CELLS) {
      expect(slugs).toContain(cell.agent);
    }
  });

  it("every cell with a doc has BOTH locale documents, and they parse", () => {
    for (const cell of CONNECT_CELLS) {
      if (!cell.doc) continue;
      for (const locale of LOCALES) {
        const p = path.join(CELLS_DIR, `${cell.doc}.${locale}.md`);
        const source = readFileSync(p, "utf8"); // missing file throws -> red
        const guide = parseGuide(source); // malformed guide throws -> red
        expect(guide.title.length).toBeGreaterThan(0);
        expect(guide.frontmatter["agent"]).toBe(cell.agent);
        expect(guide.frontmatter["apparatus"]).toBe(cell.apparatus);
      }
    }
  });

  it("a verified cell cannot carry an authoring-pending guide (the coupling)", () => {
    for (const cell of CONNECT_CELLS) {
      if (cell.status !== "verified") continue;
      expect(cell.doc, `verified cell ${cell.agent}/${cell.apparatus} needs a doc`).toBeTruthy();
      for (const locale of LOCALES) {
        const p = path.join(CELLS_DIR, `${cell.doc}.${locale}.md`);
        const guide = parseGuide(readFileSync(p, "utf8"));
        expect(
          guide.authoringPending,
          `${cell.doc}.${locale}.md still carries 'authoring: pending' but the cell is verified`,
        ).toBe(false);
        expect(
          guide.steps.length,
          `${cell.doc}.${locale}.md has no steps but the cell is verified`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("screenshot files are language-bound and orphan-free — every image maps to a declared slot", () => {
    const publicDir = path.join(__dirname, "..", "..", "public", "connect");
    for (const cell of CONNECT_CELLS) {
      if (!cell.doc) continue;
      const cellDir = path.join(publicDir, cell.shots ?? cell.doc);
      if (!existsSync(cellDir)) continue;
      for (const locale of LOCALES) {
        const localeDir = path.join(cellDir, locale);
        if (!existsSync(localeDir)) continue;
        const guide = parseGuide(
          readFileSync(path.join(CELLS_DIR, `${cell.doc}.${locale}.md`), "utf8"),
        );
        const declared = new Set(guide.steps.flatMap((st) => st.shots.map((sh) => `step-${sh.id}.png`)));
        for (const file of readdirSync(localeDir)) {
          if (!file.endsWith(".png")) continue;
          expect(
            declared.has(file),
            `${cell.doc}/${locale}/${file} maps to no declared [shot …] slot`,
          ).toBe(true);
        }
      }
      // Only locale folders (or docs) may live inside a cell's directory.
      for (const entry of readdirSync(cellDir)) {
        if (entry.endsWith(".png")) {
          throw new Error(`${entry} sits language-neutral in ${cell.shots ?? cell.doc} — images must live under de/ or en/`);
        }
      }
    }
  });

  it("a missing image in one language NEVER falls back to the other (live case: chatgpt step 6)", () => {
    const base = path.join(__dirname, "..", "..", "public", "connect", "chatgpt-web");
    // The attested material carries the English confirmation screen only —
    // the German slot must render its placeholder, never the English image.
    expect(existsSync(path.join(base, "en", "step-6.png"))).toBe(true);
    expect(existsSync(path.join(base, "de", "step-6.png"))).toBe(false);
  });
});
