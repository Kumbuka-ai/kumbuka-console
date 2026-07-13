/**
 * Help-manifest invariants. The manifest is empty today (the content does
 * not exist yet) — these guards are about the shape every future entry
 * must keep so the navigation stays data-driven: unique url-safe slugs
 * and a deterministic order. Labels are per-locale by type already
 * (Record<Locale, string> — a missing translation is a compile error).
 */
import { describe, expect, it } from "vitest";
import { helpManifest, helpSections } from "./manifest";

describe("help manifest", () => {
  it("slugs are unique", () => {
    const slugs = helpManifest.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs are lowercase and url-safe", () => {
    for (const s of helpManifest) {
      expect(s.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("helpSections() lists entries in ascending order", () => {
    const orders = helpSections().map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
