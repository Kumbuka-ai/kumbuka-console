import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie, mergeCookies } from "@/lib/auth/sessionCookies";

/**
 * BFF session-cookie relay.
 *
 * The console reaches the kumbuka-backend server-to-server (see
 * src/lib/api/client.ts), forwarding the browser's HttpOnly `q_session*`
 * cookies. Quarkus keeps the OIDC tokens *inside* those cookies and silently
 * refreshes the ~5 min access token, returning new `Set-Cookie` headers — but
 * on a server-to-server call those never reach the browser. With refresh-token
 * rotation enabled in the realm the dropped cookie is fatal: the next request
 * reuses an already-rotated refresh token and the session is revoked (the
 * "logged out after 5 minutes" symptom).
 *
 * On each real navigation we probe the backend session endpoint with the
 * browser's cookies. If Quarkus refreshed, we relay the fresh `Set-Cookie` to
 * the browser AND fold it into the forwarded request so the page's own SSR
 * fetches use the new session (and don't trigger a second, racing refresh).
 */

const BACKEND = process.env.KUMBUKA_BACKEND_URL ?? "http://kumbuka-backend:8080";

// Matches an existing kbk-locale cookie (de|en). When present we never reseed.
const LOCALE_COOKIE_RE = /(?:^|;\s*)kbk-locale=(?:de|en)(?:;|$)/;
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export async function middleware(req: NextRequest) {
  const cookie = req.headers.get("cookie");

  // Skip RSC/prefetch requests: they would multiply backend probes and, worse,
  // race the refresh-token rotation. Real top-level navigations carry neither.
  const isInternal = req.headers.has("rsc") || req.headers.has("next-router-prefetch");
  if (!hasSessionCookie(cookie) || isInternal) {
    return NextResponse.next();
  }

  let setCookies: string[] = [];
  // #49: on a fresh device the browser has no kbk-locale cookie. Adopt the
  // user's persisted user_account.locale from the /me probe so the console
  // renders in their chosen language instead of the default — the cookie is
  // the SSR source of truth (src/lib/locale.ts).
  let seedLocale: "de" | "en" | null = null;
  try {
    const probe = await fetch(`${BACKEND}/api/auth/me`, {
      headers: {
        cookie,
        accept: "application/json",
        "x-requested-with": "kumbuka-console",
      },
      redirect: "manual",
      cache: "no-store",
    });
    setCookies = probe.headers.getSetCookie();
    if (!LOCALE_COOKIE_RE.test(cookie)) {
      try {
        const me = (await probe.json()) as { locale?: unknown };
        if (me?.locale === "de" || me?.locale === "en") seedLocale = me.locale;
      } catch {
        // /me body unreadable — fall back to the default locale.
      }
    }
  } catch {
    // Backend unreachable — let the page's own fetch surface the error.
    return NextResponse.next();
  }

  if (setCookies.length === 0 && !seedLocale) {
    return NextResponse.next();
  }

  const forwarded = new Headers(req.headers);
  let merged = setCookies.length ? mergeCookies(cookie, setCookies) : cookie;
  if (seedLocale) merged = `${merged}; kbk-locale=${seedLocale}`;
  forwarded.set("cookie", merged);
  const res = NextResponse.next({ request: { headers: forwarded } });
  for (const sc of setCookies) res.headers.append("set-cookie", sc);
  if (seedLocale) {
    res.headers.append(
      "set-cookie",
      `kbk-locale=${seedLocale}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax`,
    );
  }
  return res;
}

export const config = {
  // Everything except static assets, the public sign-in page, and the auth
  // routes (which run the browser-level login/redirect flow themselves).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|signin|api/auth).*)"],
};
