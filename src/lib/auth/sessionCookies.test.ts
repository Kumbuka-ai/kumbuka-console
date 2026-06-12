import { describe, expect, it } from "vitest";
import { hasSessionCookie, mergeCookies, parseSetCookie } from "./sessionCookies";

describe("parseSetCookie", () => {
  it("extracts name and value, ignoring attributes", () => {
    expect(parseSetCookie("q_session_admin=abc123; Path=/; HttpOnly; Secure")).toEqual({
      name: "q_session_admin",
      value: "abc123",
      deleted: false,
    });
  });

  it("flags deletion via Max-Age=0", () => {
    const p = parseSetCookie("q_session_admin=; Path=/; Max-Age=0");
    expect(p?.deleted).toBe(true);
  });

  it("flags deletion via empty value", () => {
    expect(parseSetCookie("q_session_admin=")?.deleted).toBe(true);
  });

  it("returns null for malformed headers", () => {
    expect(parseSetCookie("not-a-cookie")).toBeNull();
    expect(parseSetCookie("=value")).toBeNull();
  });

  it("does not treat max-age in a non-zero value as deletion", () => {
    const p = parseSetCookie("q_session_admin=v; Max-Age=1800");
    expect(p?.deleted).toBe(false);
  });
});

describe("mergeCookies", () => {
  it("overwrites the refreshed session cookie, keeping the rest", () => {
    const merged = mergeCookies("theme=dark; q_session_admin=OLD", [
      "q_session_admin=NEW; Path=/; HttpOnly",
    ]);
    expect(merged).toContain("theme=dark");
    expect(merged).toContain("q_session_admin=NEW");
    expect(merged).not.toContain("OLD");
  });

  it("adds chunked session cookies that were not present before", () => {
    const merged = mergeCookies("q_session_admin=A", [
      "q_session_admin=A1; Path=/",
      "q_session_admin_chunk_1=B; Path=/",
    ]);
    expect(merged).toContain("q_session_admin=A1");
    expect(merged).toContain("q_session_admin_chunk_1=B");
  });

  it("removes cookies the backend deletes", () => {
    const merged = mergeCookies("q_session_admin=A; q_session_admin_chunk_1=B", [
      "q_session_admin_chunk_1=; Max-Age=0",
    ]);
    expect(merged).toContain("q_session_admin=A");
    expect(merged).not.toContain("chunk_1");
  });

  it("tolerates empty / malformed pairs in the incoming header", () => {
    expect(mergeCookies("; =x; q_session_admin=A", [])).toBe("q_session_admin=A");
  });
});

describe("hasSessionCookie", () => {
  it("detects the Quarkus session cookie", () => {
    expect(hasSessionCookie("a=b; q_session_admin=x")).toBe(true);
  });
  it("is false without it", () => {
    expect(hasSessionCookie("theme=dark")).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
    expect(hasSessionCookie("")).toBe(false);
  });
});
