/**
 * Pins the help area's default contract: `helpNavItems()` mirrors exactly
 * the manifest — the default registry contributes nothing, and no entry
 * is hard-wired anywhere else. A downstream build's contribution through
 * `getNavExtensions("help")` is the only other way an item (e.g. a
 * support page) appears.
 */
import { describe, expect, it } from "vitest";
import { getNavExtensions } from "@kumbuka-ai/console/slots";
import { helpManifest } from "./manifest";
import { helpNavItems } from "./nav";

describe("help nav (default registry)", () => {
  it('getNavExtensions("help") returns []', () => {
    expect(getNavExtensions("help")).toEqual([]);
  });

  it("helpNavItems() mirrors exactly the manifest — nothing is hard-wired elsewhere", () => {
    expect(helpNavItems().map((i) => i.href)).toEqual(
      helpManifest.map((s) => `/help/${s.slug}`),
    );
  });
});
