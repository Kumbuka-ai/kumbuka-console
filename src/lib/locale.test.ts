import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieJar = vi.hoisted(() => ({
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => cookieJar,
}));

import { getLocale, hasLocaleCookie, setLocale } from "./locale";

describe("getLocale", () => {
  beforeEach(() => {
    cookieJar.get.mockReset();
  });

  it("defaults to 'de' when the cookie is absent", async () => {
    cookieJar.get.mockReturnValue(undefined);
    expect(await getLocale()).toBe("de");
  });

  it("returns the cookie value when it is a supported locale", async () => {
    cookieJar.get.mockReturnValue({ value: "en" });
    expect(await getLocale()).toBe("en");
    cookieJar.get.mockReturnValue({ value: "de" });
    expect(await getLocale()).toBe("de");
  });

  it("falls back to 'de' on a malformed cookie value (no surprises in SSR)", async () => {
    cookieJar.get.mockReturnValue({ value: "fr" });
    expect(await getLocale()).toBe("de");
  });
});

describe("hasLocaleCookie", () => {
  beforeEach(() => {
    cookieJar.get.mockReset();
  });

  it("is true only for a valid locale cookie", async () => {
    cookieJar.get.mockReturnValue({ value: "en" });
    expect(await hasLocaleCookie()).toBe(true);
  });

  it("is false when absent or malformed", async () => {
    cookieJar.get.mockReturnValue(undefined);
    expect(await hasLocaleCookie()).toBe(false);
    cookieJar.get.mockReturnValue({ value: "fr" });
    expect(await hasLocaleCookie()).toBe(false);
  });
});

describe("setLocale", () => {
  afterEach(() => {
    cookieJar.set.mockReset();
  });

  it("writes a year-long, path-/, lax, non-HttpOnly cookie (readable client-side for the toggle)", async () => {
    await setLocale("en");
    expect(cookieJar.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = cookieJar.set.mock.calls[0];
    expect(name).toBe("kbk-locale");
    expect(value).toBe("en");
    expect(opts).toMatchObject({
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it("accepts 'de' as well", async () => {
    await setLocale("de");
    expect(cookieJar.set.mock.calls[0][1]).toBe("de");
  });
});
