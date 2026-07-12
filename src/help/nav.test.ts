/**
 * Pins the help area's default contract: with the manifest empty and the
 * default registry contributing nothing, `helpNavItems()` is empty — the
 * area renders its empty state, no entry is hard-wired anywhere. A
 * downstream build's contribution through `getNavExtensions("help")` is
 * the only way an item (e.g. a support page) appears.
 */
import { describe, expect, it } from "vitest";
import { getNavExtensions } from "@kumbuka-ai/console/slots";
import { helpNavItems } from "./nav";

describe("help nav (default registry)", () => {
  it('getNavExtensions("help") returns []', () => {
    expect(getNavExtensions("help")).toEqual([]);
  });

  it("helpNavItems() is empty in this app — nothing is hard-wired", () => {
    expect(helpNavItems()).toEqual([]);
  });
});
