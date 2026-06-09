import { describe, expect, it } from "vitest";
import { absTime, relTime } from "./time";

describe("relTime", () => {
  const now = Date.parse("2026-06-09T12:00:00Z");

  it("returns 'never' for null/undefined (the only string the UI surfaces uses as a slot label)", () => {
    expect(relTime(null, now)).toBe("never");
    expect(relTime(undefined, now)).toBe("never");
  });

  it("returns '—' for an unparseable string (must NOT propagate 'Invalid Date')", () => {
    expect(relTime("not-a-date", now)).toBe("—");
  });

  it("clamps a future timestamp to '1s ago' (s < 1 would otherwise read negative)", () => {
    // 5 seconds in the future relative to `now`
    expect(relTime("2026-06-09T12:00:05Z", now)).toBe("1s ago");
  });

  it("renders seconds when under a minute", () => {
    expect(relTime("2026-06-09T11:59:30Z", now)).toBe("30s ago");
  });

  it("renders minutes when under an hour", () => {
    expect(relTime("2026-06-09T11:55:00Z", now)).toBe("5m ago");
  });

  it("renders hours when under a day", () => {
    expect(relTime("2026-06-09T09:00:00Z", now)).toBe("3h ago");
  });

  it("renders days when under a week", () => {
    expect(relTime("2026-06-07T12:00:00Z", now)).toBe("2d ago");
  });

  it("renders weeks when under a month (≈30 days)", () => {
    // 10 days ago → 1w
    expect(relTime("2026-05-30T12:00:00Z", now)).toBe("1w ago");
  });

  it("renders months when under a year (≈365 days)", () => {
    // 45 days ago → 1mo
    expect(relTime("2026-04-25T12:00:00Z", now)).toBe("1mo ago");
  });

  it("renders years for anything ≥1 year", () => {
    expect(relTime("2024-06-09T12:00:00Z", now)).toBe("2y ago");
  });
});

describe("absTime", () => {
  it("returns empty string for null/undefined (used in title= attribute, '' hides the tooltip)", () => {
    expect(absTime(null)).toBe("");
    expect(absTime(undefined)).toBe("");
  });

  it("returns empty string for an unparseable input", () => {
    expect(absTime("not-a-date")).toBe("");
  });

  it("formats with a space separator and trailing Z, no fractional seconds (UI cell title format)", () => {
    // The .replace(/\..*$/, 'Z') step drops the ms AND the trailing Z, then
    // appends Z — relied on by every table cell with a hover-precise timestamp.
    expect(absTime("2026-06-09T05:14:23.456Z")).toBe("2026-06-09 05:14:23Z");
  });
});
