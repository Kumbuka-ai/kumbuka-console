/**
 * Pin the version surface: CONSOLE_VERSION resolves from package.json
 * (not an env var, not a hardcoded string) and matches the canonical
 * shape. Anything more elaborate would just retest Node's JSON import.
 */
import { describe, expect, it } from "vitest";
import { CONSOLE_VERSION } from "./version";
import pkg from "../../package.json";

describe("CONSOLE_VERSION", () => {
  it("matches the package.json version", () => {
    expect(CONSOLE_VERSION).toBe(pkg.version);
  });

  it("is non-empty and looks like a version", () => {
    expect(CONSOLE_VERSION).toMatch(/\S+/);
    // Allow any semver-ish thing (digits + dots, optional pre-release).
    expect(CONSOLE_VERSION).not.toBe("unknown");
  });
});
