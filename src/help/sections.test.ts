/**
 * Section-content guards — the point of the whole format:
 *
 *  - every manifest section has BOTH locale documents, and they parse,
 *  - anchor parity: the anchor sets of <slug>.de.md and <slug>.en.md are
 *    identical, so an English page that loses a heading turns CI red
 *    instead of quietly becoming poorer (deep links are language-
 *    independent by construction),
 *  - the types page carries the [type-catalog] block — the connect area
 *    deep-links to /help/types#<type-slug>; without the catalogue those
 *    links point at nothing.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LOCALES, type Locale } from "@/i18n/config";
import { docAnchors, parseHelpDoc } from "./doc";
import { helpManifest } from "./manifest";

const SECTIONS_DIR = path.join(__dirname, "sections");

function loadSection(slug: string, locale: Locale) {
  const p = path.join(SECTIONS_DIR, `${slug}.${locale}.md`);
  const source = readFileSync(p, "utf8"); // missing file throws -> red
  return parseHelpDoc(source);
}

describe("help section documents", () => {
  it("every manifest section has both locale documents, and they parse", () => {
    for (const section of helpManifest) {
      for (const locale of LOCALES) {
        const doc = loadSection(section.slug, locale);
        expect(doc.title).not.toBe("");
        expect(doc.frontmatter.updated).toBeTruthy();
      }
    }
  });

  it("anchor parity: de and en carry the identical anchor set, in order", () => {
    for (const section of helpManifest) {
      const de = docAnchors(loadSection(section.slug, "de"));
      const en = docAnchors(loadSection(section.slug, "en"));
      expect(en, `anchor drift in ${section.slug}`).toEqual(de);
    }
  });

  it("the types page carries the [type-catalog] block in both locales", () => {
    for (const locale of LOCALES) {
      const doc = loadSection("types", locale);
      expect(
        doc.blocks.some((b) => b.kind === "type-catalog"),
        `types.${locale}.md has no [type-catalog] block`,
      ).toBe(true);
    }
  });
});
