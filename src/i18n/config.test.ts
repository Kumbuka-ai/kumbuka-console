import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, LOCALES, LOCALE_LABELS } from "./config";

describe("locale config", () => {
  it("supports exactly de + en", () => {
    expect([...LOCALES]).toEqual(["de", "en"]);
  });

  it("defaults to German (the product is de-first)", () => {
    expect(DEFAULT_LOCALE).toBe("de");
  });

  it("labels every supported locale", () => {
    expect(LOCALE_LABELS).toEqual({ de: "Deutsch", en: "English" });
  });

  describe("isLocale", () => {
    it("accepts the supported locales", () => {
      expect(isLocale("de")).toBe(true);
      expect(isLocale("en")).toBe(true);
    });

    it("rejects anything else (unknown string, casing, null, non-string)", () => {
      expect(isLocale("fr")).toBe(false);
      expect(isLocale("EN")).toBe(false);
      expect(isLocale("")).toBe(false);
      expect(isLocale(undefined)).toBe(false);
      expect(isLocale(null)).toBe(false);
      expect(isLocale(42)).toBe(false);
    });
  });
});
