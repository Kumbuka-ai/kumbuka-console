/**
 * Type-catalogue invariants. `Record<EntryType, HelpTypeEntry>` already
 * makes a missing catalogue entry a compile error; these tests hold what
 * the types cannot:
 *
 *  - TYPE_TEACHING_ORDER (didactic, descending bindingness) and
 *    ENTRY_TYPE_ORDER (data order) deliberately differ, but they must
 *    carry the SAME set — a type in one and not the other is drift,
 *  - the catalogue content is complete per locale (no empty field can
 *    reach the rendered rows).
 */
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { ENTRY_TYPE_ORDER } from "@/lib/api/types";
import { HELP_TYPES, TYPE_TEACHING_ORDER } from "./types-manifest";

describe("type catalogue", () => {
  it("teaching order and data order carry the same set", () => {
    expect(new Set(TYPE_TEACHING_ORDER)).toEqual(new Set(ENTRY_TYPE_ORDER));
    expect(TYPE_TEACHING_ORDER).toHaveLength(ENTRY_TYPE_ORDER.length);
  });

  it("every catalogue field is filled in every locale", () => {
    for (const type of ENTRY_TYPE_ORDER) {
      const entry = HELP_TYPES[type];
      expect(entry.result.key).toMatch(/^[a-z0-9.-]+$/);
      for (const locale of LOCALES) {
        expect(entry.meaning[locale], `${type}.meaning.${locale}`).not.toBe("");
        expect(entry.example[locale], `${type}.example.${locale}`).not.toBe("");
        expect(entry.result.content[locale], `${type}.result.content.${locale}`).not.toBe("");
      }
    }
  });
});
