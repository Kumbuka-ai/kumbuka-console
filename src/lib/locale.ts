/**
 * Locale = cookie (SSR source of truth), mirrored to the backend per user.
 *
 * Read in the root layout (and by next-intl's request config) to render the
 * right language without a backend round-trip. Written by setLocaleAction,
 * which ALSO persists to user_account.locale via updateMe({ locale }) so the
 * choice follows the user across devices. On a fresh device the cookie is
 * seeded from session.locale (see syncLocaleFromSession).
 *
 * Mirrors the theme.ts pattern (cookie, httpOnly:false so the toggle can flip
 * it optimistically client-side).
 */
import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

const COOKIE = "kbk-locale";
const MAX_AGE = 60 * 60 * 24 * 365;

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

/** True if the locale cookie is present (used to decide first-device seeding). */
export async function hasLocaleCookie(): Promise<boolean> {
  return isLocale((await cookies()).get(COOKIE)?.value);
}

export async function setLocale(l: Locale): Promise<void> {
  (await cookies()).set(COOKIE, l, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
