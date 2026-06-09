import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieJar = vi.hoisted(() => ({
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => cookieJar,
}));

import { getTheme, setTheme } from "./theme";

describe("getTheme", () => {
  beforeEach(() => {
    cookieJar.get.mockReset();
  });

  it("returns 'light' when the cookie is absent (the default render)", async () => {
    cookieJar.get.mockReturnValue(undefined);
    expect(await getTheme()).toBe("light");
  });

  it("returns 'dark' when the cookie is exactly 'dark'", async () => {
    cookieJar.get.mockReturnValue({ value: "dark" });
    expect(await getTheme()).toBe("dark");
  });

  it("returns 'light' when the cookie is 'light'", async () => {
    cookieJar.get.mockReturnValue({ value: "light" });
    expect(await getTheme()).toBe("light");
  });

  it("falls back to 'light' on a malformed cookie value (no surprises in SSR)", async () => {
    cookieJar.get.mockReturnValue({ value: "neon" });
    expect(await getTheme()).toBe("light");
  });
});

describe("setTheme", () => {
  afterEach(() => {
    cookieJar.set.mockReset();
  });

  it("writes a year-long, path-/, lax, non-HttpOnly cookie (must be readable by the inline FOUC guard)", async () => {
    await setTheme("dark");
    expect(cookieJar.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = cookieJar.set.mock.calls[0];
    expect(name).toBe("kbk-theme");
    expect(value).toBe("dark");
    expect(opts).toMatchObject({
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it("accepts 'light' as well", async () => {
    await setTheme("light");
    expect(cookieJar.set.mock.calls[0][1]).toBe("light");
  });
});
