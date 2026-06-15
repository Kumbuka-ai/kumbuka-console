"use client";

/**
 * Error boundary for the authenticated (app) route group.
 *
 * Why this exists: the layout's data fetches (listScopes, listUsers) can
 * fail transiently when the backend is unreachable (502/503 during a
 * redeploy, network hiccup, etc.). Without a boundary, the whole console
 * shell renders the generic Next.js 500 page even though the operator is
 * authenticated and would just like to retry. This boundary turns that
 * into a polite, actionable surface using the existing ErrorState
 * primitive — same visual vocabulary as our regular error pages.
 *
 * Next.js calls this with:
 *   error.message — the thrown Error's message (we don't surface it
 *     directly; it can leak internals).
 *   error.digest  — the production-stable digest string (we DO surface
 *     it, so a screenshot or report can be matched to server logs).
 *   reset()       — re-renders the segment. We wire it to the "Retry"
 *     button; the user stays on the same URL.
 *
 * NB: this is a Client Component (the file directive at the top is
 * required by Next.js for error.tsx). State + handlers run in the
 * browser — no server calls happen here.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/State";

export default function AppErrorBoundary({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  // Log to the browser console for in-session debugging; production logs
  // capture the original throw on the server side.
  useEffect(() => {
    console.error("(app) error boundary caught:", error);
  }, [error]);

  const t = useTranslations("appError");

  return (
    <main className="main">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <ErrorState
          title={t("title")}
          body={t("body")}
          code={error.digest ? t("digest", { digest: error.digest }) : undefined}
        >
          <button type="button" onClick={reset} className="btn">
            {t("retry")}
          </button>
          <a href="/signin" className="btn ghost">
            {t("signinAgain")}
          </a>
        </ErrorState>
      </div>
    </main>
  );
}
