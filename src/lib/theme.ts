/**
 * Theme = cookie, not localStorage. Read in the root layout, written by a
 * server action wired to the Topbar's theme toggle.
 *
 * We deliberately defer backend persistence — the SessionView shape does
 * not yet carry a `preferences.theme`; when it does, this becomes a
 * one-line wrap around updateMe().
 */
import "server-only";

import { cookies } from "next/headers";

const COOKIE = "kbk-theme";

export type Theme = "light" | "dark";

export async function getTheme(): Promise<Theme> {
  const c = (await cookies()).get(COOKIE)?.value;
  return c === "dark" ? "dark" : "light";
}

export async function setTheme(t: Theme): Promise<void> {
  (await cookies()).set(COOKIE, t, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
