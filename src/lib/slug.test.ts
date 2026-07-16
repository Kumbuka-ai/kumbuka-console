import { describe, expect, it } from "vitest";
import { KEY_PATTERN, SLUG_PATTERN, isValidKey, isValidSlug, slugify } from "./slug";

/**
 * Pins the two canonical grammar strings verbatim. The server holds the same
 * languages (its Java forms use possessive quantifiers, which JS lacks — the
 * accepted language is identical) and pins them on its side too; any drift
 * must fail loud here, not surface as a client/server validation mismatch.
 */
describe("canonical grammar pins", () => {
  it("SLUG_PATTERN is the canonical kebab-slug grammar, verbatim", () => {
    expect(SLUG_PATTERN.source).toBe("^[a-z0-9]+(?:-[a-z0-9]+)*$");
  });

  it("KEY_PATTERN is the canonical namespaced-key grammar, verbatim", () => {
    expect(KEY_PATTERN.source).toBe("^[a-z0-9]+(?:[.\\-][a-z0-9]+)*$");
  });
});

describe("isValidSlug", () => {
  it.each(["billing-platform", "a", "a1-b2", "global", "123"])(
    "accepts '%s'",
    (slug) => {
      expect(isValidSlug(slug)).toBe(true);
    },
  );

  it.each(["Billing", "a--b", "-a", "a-", "a.b", "a_b", "", "with spaces"])(
    "rejects '%s'",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("isValidKey", () => {
  it.each(["a", "decision.d-1", "status.beta-gate", "v1.0.0", "x-y", "a.b.c"])(
    "accepts '%s'",
    (key) => {
      expect(isValidKey(key)).toBe(true);
    },
  );

  it.each(["UPPER", "a..b", "a--b", ".a", "a.", "-a", "a-", "a_b", "", "a/b"])(
    "rejects '%s'",
    (key) => {
      expect(isValidKey(key)).toBe(false);
    },
  );
});

describe("slugify", () => {
  it("normalises a display name to the kebab grammar", () => {
    expect(slugify("Billing Platform")).toBe("billing-platform");
    expect(slugify("  Q3  Planning!  ")).toBe("q3-planning");
    expect(slugify("!!!")).toBe("");
  });

  it.each(["Billing Platform", "x", "a  b  c", "!!x!!"])(
    "output for '%s' is empty or on the slug grammar",
    (name) => {
      const slug = slugify(name);
      expect(slug === "" || isValidSlug(slug)).toBe(true);
    },
  );
});
