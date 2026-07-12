/**
 * Message-catalog parity guard: de and en carry exactly the same key set.
 *
 * The console ships both languages as full equals — there is no fallback
 * locale. next-intl does not silently fall back across locales here (each
 * locale loads only its own catalog), so a missing key would surface at
 * runtime as a raw key name in the UI. This test moves that discovery to
 * CI: a text added in one language and not the other fails the build,
 * visibly, before it can rot into a half-translated product.
 */
import { describe, expect, it } from "vitest";
import de from "./messages/de.json";
import en from "./messages/en.json";

function flattenKeys(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    return [prefix];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalogs", () => {
  it("de and en carry exactly the same keys — both languages are full equals", () => {
    const deKeys = flattenKeys(de).sort();
    const enKeys = flattenKeys(en).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("no catalog value is an empty string — an empty text is a missing text", () => {
    const emptyOf = (node: unknown, prefix = ""): string[] => {
      if (typeof node === "string") return node.trim() === "" ? [prefix] : [];
      if (typeof node !== "object" || node === null) return [];
      return Object.entries(node).flatMap(([key, value]) =>
        emptyOf(value, prefix ? `${prefix}.${key}` : key),
      );
    };
    expect(emptyOf(de)).toEqual([]);
    expect(emptyOf(en)).toEqual([]);
  });
});
